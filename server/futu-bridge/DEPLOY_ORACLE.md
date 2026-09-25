# 在 Oracle Cloud（Always Free）部署 OpenD + futu-bridge

完成後的架構：

```
瀏覽器 (Vercel dashboard)
   │  HTTPS + Bearer token
   ▼
Oracle VM ── Caddy :443 ──> futu-bridge 127.0.0.1:8787 ──> OpenD 127.0.0.1:33333 ──> 富途伺服器
```

對外只開 **22（SSH）、80、443**。OpenD 的 11111 / 33333 / 22222 **絕對不要**開。

整個流程大約 1 小時，順序如下：

| 步驟 | 在哪裡做 |
|---|---|
| 0. 準備資料 | 你的電腦 |
| 1. 確認 Home Region | Oracle 主控台 |
| 2. 建立 VCN（虛擬網路） | Oracle 主控台 |
| 3. 開放 80 / 443（Security List） | Oracle 主控台 |
| 4. 建立 VM | Oracle 主控台 |
| 5. 固定公網 IP（Reserved Public IP） | Oracle 主控台 |
| 6. SSH 連進 VM | 你的電腦 |
| 7. VM 基本設定 + 開放 iptables | VM |
| 8. 安裝與登入 OpenD | VM |
| 9. 安裝 futu-bridge | VM |
| 10. 安裝 Caddy（HTTPS） | VM |
| 11. 設定 dashboard | 瀏覽器 |
| 12. 避免 VM 被 Oracle 回收 | Oracle 主控台 |

---

## 0. 事前準備

先準備好以下資料：

- 富途帳號（牛牛號最方便）與登入密碼，以及能收簡訊驗證碼的手機
- 你的 dashboard 網址，例如 `https://portfolio-manager-xxx.vercel.app`（在 Vercel 專案的 **Domains** 可以看到）
- Windows 內建的 OpenSSH。在 PowerShell 輸入 `ssh -V`，有顯示版本就可以用

---

## 1. 確認 Home Region

Always Free 的資源**只能建在 Home Region**（申請帳號時選的區域）。

1. 登入 <https://cloud.oracle.com>
2. 看右上角的區域名稱，例如 `Japan East (Tokyo)`，這就是 Home Region
3. 接下來所有步驟都在這個區域操作，不要切換

---

## 2. 建立 VCN（虛擬網路）

VCN 是 VM 所在的虛擬網路。用精靈建立，它會一併建好公開子網路、Internet Gateway 和路由表。

1. 左上角 ☰ 選單 → **Networking** → **Virtual cloud networks**
2. 左側 **Compartment** 選你的根 compartment（通常就是帳號名稱）
3. 點 **Actions** → **Start VCN Wizard**（舊版介面是直接顯示 **Start VCN Wizard** 按鈕）
4. 選 **Create VCN with Internet Connectivity** → **Start VCN Wizard**
5. 填寫：
   - **VCN name**：`futu-vcn`
   - 其他（CIDR 等）維持預設
6. **Next** → **Create**
7. 看到全部項目都是綠色勾勾之後，點 **View VCN**

精靈會建立兩個子網路：`public subnet-futu-vcn`（公開）和 `private subnet-futu-vcn`（私有）。**VM 要放在公開子網路。**

---

## 3. 開放 80 / 443（Security List）

Oracle 的防火牆有**兩層**：雲端層的 Security List，以及 VM 內的 iptables。**兩層都要開**，少開一層就連不進來。這一步先開雲端層，iptables 在第 7 步處理。

1. 在剛剛的 VCN 頁面切到 **Security** 分頁（舊版介面在左側 **Resources → Security Lists**）
2. 點 **Default Security List for futu-vcn**
3. 切到 **Security rules** 分頁（舊版介面在左側 **Ingress Rules**）→ **Add Ingress Rules**
4. 第一條規則（HTTP，Caddy 申請憑證會用到）：
   - **Stateless**：不要勾
   - **Source Type**：`CIDR`
   - **Source CIDR**：`0.0.0.0/0`
   - **IP Protocol**：`TCP`
   - **Source Port Range**：留空（All）
   - **Destination Port Range**：`80`
   - **Description**：`HTTP for Caddy ACME`
5. 點 **+ Another Ingress Rule**，第二條規則（HTTPS）：
   - 同上，**Destination Port Range** 改成 `443`，**Description**：`HTTPS futu-bridge`
6. **Add Ingress Rules**

完成後 Ingress Rules 應該會有：

| Source | Protocol | Dest Port | 用途 |
|---|---|---|---|
| 0.0.0.0/0 | TCP | 22 | SSH（預設就有） |
| 0.0.0.0/0 | ICMP | – | 預設就有 |
| 10.0.0.0/16 | ICMP | – | 預設就有 |
| 0.0.0.0/0 | TCP | 80 | 新增 |
| 0.0.0.0/0 | TCP | 443 | 新增 |

> **加強安全（選配）**：把 22 那條的 Source CIDR 從 `0.0.0.0/0` 改成你家的 IP，例如 `1.2.3.4/32`（查 IP：<https://ifconfig.me>）。缺點是家裡的 IP 變了就會 SSH 不進去，需要回來改。

---

## 4. 建立 VM

1. ☰ → **Compute** → **Instances** → **Create instance**
2. **Name**：`futu-opend`
3. **Placement**：預設的 Availability Domain 即可。如果之後選 shape 時看不到 Always Free 的選項，再回來換一個 AD
4. **Image and shape** 區塊：
   - **Image** → **Change image** → **Ubuntu** → 選 **Canonical Ubuntu 22.04**（有 24.04 也可以）→ **Select image**
     - 注意不要選到名稱有 `aarch64` 的版本
   - **Shape** → **Change shape** → **Virtual machine** → **Specialty and previous generation** → 勾 **VM.Standard.E2.1.Micro**（旁邊有 **Always Free-eligible** 標籤）→ **Select shape**
     - 請選 AMD 的 E2.1.Micro，**不要選 Ampere（ARM）**。OpenD 只提供 x86_64 的 Linux 版本
5. **Networking** 區塊：
   - **Primary network**：**Select existing virtual cloud network** → `futu-vcn`
   - **Subnet**：**Select existing subnet** → `public subnet-futu-vcn`
   - **Public IPv4 address**：選 **Automatically assign public IPv4 address**（一定要勾）
6. **Add SSH keys** 區塊：
   - 選 **Generate a key pair for me**
   - 點 **Download private key** 和 **Download public key**，兩個都存好，例如放到 `C:\Users\<你>\.ssh\oracle-futu.key`
   - ⚠️ 私鑰**只能在這時下載**，弄丟就只能重建 VM
7. **Boot volume**：維持預設（約 47 GB，在免費額度內）
8. 點 **Create**
9. 等狀態從 `PROVISIONING` 變成 `RUNNING`（約 1 至 2 分鐘）
10. 在 Instance 詳細頁的 **Instance access** 區塊（或 **Primary VNIC** 區塊）記下 **Public IP address**，例如 `140.238.1.2`

> 如果看到 **Out of capacity** / **Out of host capacity**，代表這個 AD 暫時沒有空位。換一個 AD，或過幾小時再試。

---

## 5. 固定公網 IP（Reserved Public IP）

VM 預設拿到的是 **Ephemeral（臨時）IP**：VM 重開機時不會變，但只要 VM 被刪除重建，IP 就會換掉。dashboard 的網址是用 IP 組成的（`140-238-1-2.sslip.io`），所以建議換成 **Reserved（保留）IP**，這樣重建 VM 時可以把同一個 IP 掛回去。

1. 進入 Instance 詳細頁 → **Networking** 分頁（舊版介面在左側 **Resources → Attached VNICs**）→ 點 VNIC 名稱
2. 切到 **IP administration** 分頁（舊版介面在左側 **IPv4 Addresses**）
3. 在 Primary private IP 那一列右側點 **⋮** → **Edit**
4. **Public IP type** 先選 **No public IP** → **Update**（先移除 ephemeral IP）
5. 再按一次 **⋮** → **Edit** → **Public IP type** 選 **Reserved public IP**
   - 選 **Create new reserved IP address**，名稱填 `futu-bridge-ip`
   - **Update**
6. 記下新的 IP，**後面的步驟都用這個 IP**

> Always Free 帳號的 Reserved IP 有數量上限。如果建立時出錯，保留原本的 Ephemeral IP 也能用，只要不刪除 VM 就不會變。

---

## 6. SSH 連進 VM

以下在 **Windows PowerShell** 執行。先把 `C:\Users\<你>\.ssh\oracle-futu.key` 換成你實際的路徑，`140.238.1.2` 換成你的 IP。

### 6-1. 修正私鑰權限（Windows 必做，只需做一次）

Windows 版 OpenSSH 會拒絕權限太寬鬆的私鑰（錯誤訊息是 `UNPROTECTED PRIVATE KEY FILE`）：

```powershell
$key = "$env:USERPROFILE\.ssh\oracle-futu.key"
icacls $key /inheritance:r
icacls $key /grant:r "$($env:USERNAME):(R)"
```

### 6-2. 連線

```powershell
ssh -i $key ubuntu@140.238.1.2
```

第一次連線會問 `Are you sure you want to continue connecting`，輸入 `yes`。看到 `ubuntu@futu-opend:~$` 就代表成功了。

### 6-3.（選配）設定捷徑

在 `C:\Users\<你>\.ssh\config` 加入以下內容，之後只要輸入 `ssh futu`：

```
Host futu
    HostName 140.238.1.2
    User ubuntu
    IdentityFile ~/.ssh/oracle-futu.key
```

> 連不上時：
> - `Connection timed out`：確認 Security List 有 22 的規則，並且確認 VM 放在 **public** subnet、有公網 IP
> - `Permission denied (publickey)`：確認使用者是 `ubuntu`，而且私鑰檔案沒選錯

---

## 7. VM 基本設定 + 開放 iptables

以下**都在 VM 裡**執行。

### 7-1. 更新系統

```bash
sudo apt update && sudo apt -y upgrade
sudo timedatectl set-timezone Asia/Taipei   # 讓 log 時間好讀，可依你所在地調整
```

如果出現 kernel 更新的提示，執行 `sudo reboot`，等 1 分鐘後重新 SSH 連線。

### 7-2. 加 swap

E2.1.Micro 只有 1 GB 記憶體，同時跑 OpenD 和 Node 會很吃緊。加 2 GB swap：

```bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
free -h   # Swap 那一列應該顯示 2.0Gi
```

### 7-3. 開放 iptables（第二層防火牆）

Oracle 的 Ubuntu 映像檔內建一組 iptables 規則，只放行 SSH，其他全部 REJECT。**不要用 `ufw`**，它會跟 Oracle 的規則衝突。

先看目前的規則：

```bash
sudo iptables -L INPUT -n --line-numbers
```

輸出大概會長這樣：

```
num  target  prot opt source     destination
1    ACCEPT  all  --  0.0.0.0/0  0.0.0.0/0   state RELATED,ESTABLISHED
2    ACCEPT  icmp --  0.0.0.0/0  0.0.0.0/0
3    ACCEPT  all  --  0.0.0.0/0  0.0.0.0/0
4    ACCEPT  udp  --  0.0.0.0/0  0.0.0.0/0   udp spt:123
5    ACCEPT  tcp  --  0.0.0.0/0  0.0.0.0/0   state NEW tcp dpt:22
6    REJECT  all  --  0.0.0.0/0  0.0.0.0/0   reject-with icmp-host-prohibited
```

新規則必須插在 **REJECT 那一行之前**。以上面的例子來說，REJECT 是第 6 行，所以插在第 6 行：

```bash
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT
sudo netfilter-persistent save   # 存檔，重開機後才不會消失
sudo iptables -L INPUT -n --line-numbers   # 確認 80、443 在 REJECT 之前
```

> 如果你的 REJECT 不在第 6 行，就把上面指令的 `6` 換成實際的行號。

---

## 8. 安裝與登入 OpenD

### 8-1. 下載

下載頁 <https://www.futunn.com/download/OpenAPI> 的按鈕是用 JavaScript 觸發的，沒辦法複製連結。
檔案實際放在 `https://softwaredownload.futunn.com/<檔名>`，Ubuntu 版的檔名格式是
`Futu_OpenD_<版本>_Ubuntu18.04.tar.gz`（約 470 MB）。

在 VM 下載並解壓（以 10.11.7108 為例，與 bridge 使用的 `futu-api` SDK 版本相同）：

```bash
cd ~
wget -O opend.tar.gz "https://softwaredownload.futunn.com/Futu_OpenD_10.11.7108_Ubuntu18.04.tar.gz"
tar xzf opend.tar.gz
find ~ -name FutuOpenD -type f   # 找出命令列版 OpenD 所在的資料夾
```

`find` 會印出類似 `/home/ubuntu/Futu_OpenD_9.x_Ubuntu18.04/Futu_OpenD_9.x_Ubuntu18.04/FutuOpenD` 的路徑。把**那個資料夾裡的所有檔案**複製到 `/opt/futu-opend`：

```bash
sudo mkdir -p /opt/futu-opend && sudo chown ubuntu: /opt/futu-opend
cp -r /home/ubuntu/Futu_OpenD_*/Futu_OpenD_*/* /opt/futu-opend/   # 路徑依 find 的結果調整
chmod +x /opt/futu-opend/FutuOpenD
ls /opt/futu-opend   # 應該看得到 FutuOpenD 和 FutuOpenD.xml
```

> 不要選到名稱有 `GUI` 的資料夾，那是圖形介面版，VM 上不能用。

### 8-2. 產生 WebSocket key

OpenD 設定檔裡存的是 key 的 **MD5**，bridge 則使用 **key 本身**（SDK 連線時會自己算 MD5 來比對）。一次把兩個值都產生出來：

```bash
KEY=$(openssl rand -hex 16)
echo "bridge 用的 key（FUTU_WEBSOCKET_KEY）: $KEY"
echo "XML 用的 MD5（websocket_key_md5）: $(echo -n "$KEY" | md5sum | cut -d' ' -f1)"
```
bridge 用的 key（FUTU_WEBSOCKET_KEY）: 33eb5b0d0e41779e7b4fdd9dbf07d792
XML 用的 MD5（websocket_key_md5）: 71e245adb9bc6121ccdf4bd5601905ee
**兩個值都記下來**，第 9-3 步會用到 key 本身。

### 8-3. 編輯設定檔

OpenD 10.10 版之後，帳號密碼**不寫在設定檔**，改成第一次啟動時在畫面上輸入（見 8-4），所以 XML 裡看不到登入相關的欄位。

```bash
nano /opt/futu-opend/FutuOpenD.xml
```

`<ip>127.0.0.1</ip>` 預設就是對的，不要改。只要把下面 5 行的 `<!-- ` 和 ` -->` 拿掉並填值（`nano` 裡按 `Ctrl+W` 可以搜尋）：

| 原本 | 改成 |
|---|---|
| `<!-- <telnet_ip>127.0.0.1</telnet_ip> -->` | `<telnet_ip>127.0.0.1</telnet_ip>` |
| `<!-- <telnet_port>22222</telnet_port> -->` | `<telnet_port>22222</telnet_port>` |
| `<!-- <websocket_ip>127.0.0.1</websocket_ip> -->` | `<websocket_ip>127.0.0.1</websocket_ip>` |
| `<!-- <websocket_port>33333</websocket_port> -->` | `<websocket_port>33333</websocket_port>` |
| `<!-- <websocket_key_md5>14e1...</websocket_key_md5> -->` | `<websocket_key_md5>8-2 產生的 MD5</websocket_key_md5>` |

注意：`websocket_private_key` / `websocket_cert` 維持註解。HTTPS 由 Caddy 處理，OpenD 本身不需要 SSL。

`nano` 的存檔與離開：`Ctrl+O` → `Enter` → `Ctrl+X`。

### 8-4. 第一次登入（前景執行，互動式輸入帳密）

```bash
cd /opt/futu-opend && ./FutuOpenD
```

OpenD 會進入互動登入模式，依序詢問：

1. **帳號**：牛牛號最簡單。如果用手機號碼，格式是 `+國碼 手機號`，例如 `+886 912345678`
2. **密碼**
3. **是否記住密碼**：選**是**。之後的背景服務要靠這個記住的憑證自動登入

登入過程中可能出現：

- **簡訊驗證碼**：手機收到後，在同一個畫面輸入：
  ```
  input_phone_verify_code -code=123456
  ```
  沒收到的話，輸入 `req_phone_verify_code` 重新發送
- **圖形驗證碼**：輸入 `req_pic_verify_code`，依提示查看圖片，再輸入：
  ```
  input_pic_verify_code -code=abcd
  ```
- 如果 log 提示需要**同意 OpenAPI 協議或完成問卷**，照 log 裡的連結用富途 App 或網頁完成，再重新執行 `./FutuOpenD`

看到登入成功的訊息後，輸入 `exit` 離開，接著設定成背景服務。

### 8-5. 設成系統服務（開機自動啟動）

先建立 bridge 目錄並上傳程式碼，因為 service 檔在裡面。這一步在**你的電腦 PowerShell** 執行：

```powershell
ssh -i $key ubuntu@140.238.1.2 "sudo mkdir -p /opt/futu-bridge && sudo chown ubuntu: /opt/futu-bridge"
cd D:\portfolio-manager\server\futu-bridge
scp -i $key -r index.js opend.js package.json package-lock.json deploy ubuntu@140.238.1.2:/opt/futu-bridge/
```

回到 **VM**，複製 service 檔並填入你的帳號：

```bash
sudo cp /opt/futu-bridge/deploy/opend.service /etc/systemd/system/
sudo nano /etc/systemd/system/opend.service
# 把 ExecStart 裡的 YOUR_FUTU_ID 換成 8-4 登入用的帳號
# 如果用手機號碼登入：-login_account=912345678 -area_code=+886
sudo systemctl daemon-reload
sudo systemctl enable --now opend
systemctl status opend --no-pager | head -5   # 應該是 active (running)
# OpenD 的畫面輸出已導到 /dev/null；它自己的 log 檔在這裡（按 Ctrl+C 離開，服務會繼續跑）：
tail -f "$(find ~/.com.futunn.FutuOpenD/Log -type f -printf '%T@ %p\n' | sort -n | tail -1 | cut -d' ' -f2-)"
```

確認 port 只綁在本機：

```bash
ss -tlnp | grep -E '11111|33333|22222'
# 每一行都必須是 127.0.0.1:xxxx，不能出現 0.0.0.0 或 *
```

### 8-6. 之後又要驗證碼時

不用停止服務，直接用 telnet 輸入：

```bash
sudo apt install -y telnet   # 第一次才需要
telnet 127.0.0.1 22222
input_phone_verify_code -code=123456
# 離開 telnet：按 Ctrl+] 再輸入 quit
```

---

## 9. 安裝 futu-bridge

### 9-1. 安裝 Node.js 22

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs
node -v   # 應該顯示 v22.x
```

### 9-2. 安裝依賴

```bash
cd /opt/futu-bridge && npm ci --omit=dev
```

### 9-3. 設定環境變數

```bash
openssl rand -hex 32   # 產生 BRIDGE_TOKEN，記下來，dashboard 也要填同一個 74ef03b5ea22a8893003c936196b40b9492a8ff92355480fe0ecd2ef90694a69
sudo cp /opt/futu-bridge/deploy/futu-bridge.env.example /etc/futu-bridge.env
sudo chmod 600 /etc/futu-bridge.env
sudo nano /etc/futu-bridge.env
```

填入：

```ini
BRIDGE_TOKEN=剛剛產生的 64 字元
ALLOWED_ORIGINS=https://portfolio-manager-xxx.vercel.app
FUTU_WEBSOCKET_KEY=8-2 產生的 key 本身（不是 MD5）
```

`ALLOWED_ORIGINS` 的注意事項：
- 要跟瀏覽器網址列的 origin **完全一樣**：包含 `https://`，結尾**不能有** `/`
- 有多個網址（自訂網域、`http://localhost:5173` 開發用）時，用逗號分隔，不要加空格

### 9-4. 啟動並測試

```bash
sudo cp /opt/futu-bridge/deploy/futu-bridge.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now futu-bridge
journalctl -u futu-bridge -n 20   # 應該看到 futu-bridge listening on 127.0.0.1:8787

curl -s localhost:8787/health
# {"ok":true}

TOKEN=$(sudo grep '^BRIDGE_TOKEN=' /etc/futu-bridge.env | cut -d= -f2)
curl -s -H "Authorization: Bearer $TOKEN" localhost:8787/positions
# {"positions":[{"code":"NVDA",...}],"updatedAt":"..."}
```

如果 `/positions` 回傳的是錯誤，請參考文末的疑難排解。

---

## 10. 安裝 Caddy（自動 HTTPS）

不用買網域：[sslip.io](https://sslip.io) 會把 `140-238-1-2.sslip.io` 自動解析到 `140.238.1.2`，Caddy 則會自動跟 Let's Encrypt 申請憑證。

### 10-1. 安裝

```bash
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update && sudo apt install -y caddy
```

### 10-2. 設定

```bash
sudo cp /opt/futu-bridge/deploy/Caddyfile /etc/caddy/Caddyfile
sudo nano /etc/caddy/Caddyfile
```

把 `140-238-1-2.sslip.io` 換成**你的 IP，並把點換成橫線**：

```
140-238-1-2.sslip.io {
	reverse_proxy 127.0.0.1:8787
}
```

```bash
sudo systemctl reload caddy
journalctl -u caddy -n 30   # 看到 "certificate obtained successfully" 就代表憑證申請成功
```

### 10-3. 從外部測試

在**你的電腦 PowerShell**：

```powershell
curl.exe -s https://140-238-1-2.sslip.io/health
# {"ok":true}
```

---

## 11. 設定 dashboard

1. 開啟 dashboard → **Settings** → **Futu (US, via futu-bridge)**
2. **Bridge URL**：`https://140-238-1-2.sslip.io`（結尾不要加 `/positions`）
3. **Bridge Token**：第 9-3 步產生的 `BRIDGE_TOKEN`
4. **Save**，回到 Dashboard，應該就會出現 Futu 的持倉

---

## 12. 避免 VM 被 Oracle 回收（重要）

Oracle 會**回收閒置的 Always Free VM**：7 天內 CPU、網路使用率都很低，就會被判定為閒置。這台 VM 的負載很輕，很可能被判定為閒置。

最可靠的做法是**把帳號升級成 Pay As You Go（PAYG）**：

1. ☰ → **Billing & Cost Management** → **Upgrade and Manage Payment**
2. 選 **Pay As You Go** → 綁定信用卡

升級後 Always Free 的資源**仍然免費**，但不會再被回收。建議同時設定預算警示，以防誤用付費資源：☰ → **Billing & Cost Management** → **Budgets** → **Create Budget**，金額設 `1`（USD），並設定寄信通知。

---

## 驗證清單

- [ ] `ss -tlnp` 顯示 11111 / 33333 / 22222 / 8787 都只綁在 `127.0.0.1`
- [ ] `systemctl is-active opend futu-bridge caddy` 三個都是 `active`
- [ ] 從外部 `curl https://<ip>.sslip.io/health` 回傳 `{"ok":true}`
- [ ] 從外部 `curl https://<ip>.sslip.io/positions` 不帶 token 時回傳 401
- [ ] dashboard 顯示 Futu 持倉
- [ ] `sudo reboot` 之後以上項目全部自動恢復

---

## 疑難排解

| 症狀 | 原因 / 解法 |
|---|---|
| 外部 `curl https://...` 逾時 | 雲端的 Security List 或 VM 的 iptables 少開了 80/443（第 3、7-3 步） |
| Caddy log 顯示憑證申請失敗 | 外部連不到 80 port，檢查同上；另外確認 Caddyfile 的 IP 寫對（點換成橫線） |
| `/positions` 回傳 502 `cannot reach OpenD` | OpenD 沒在跑或還沒登入：`systemctl status opend`，並查看 `~/.com.futunn.FutuOpenD/Log/` 裡最新的 log。如果 log 顯示記住的密碼失效，先 `sudo systemctl stop opend`，再照 8-4 重新前景登入一次 |
| `/positions` 回傳 502 `rejected the connection` | `FUTU_WEBSOCKET_KEY` 的 MD5 跟 `FutuOpenD.xml` 的 `websocket_key_md5` 對不上。env 要填 key 本身，XML 要填 MD5 |
| `/positions` 回傳 502 `no real US trading account` | OpenD 還沒完成登入，或帳號沒有美股交易權限 |
| dashboard 顯示 401 | Settings 裡的 Bridge Token 跟 VM 上的不一樣 |
| 瀏覽器 console 出現 CORS 錯誤 | `ALLOWED_ORIGINS` 跟 dashboard 網址不完全相同（例如多了 `/`、少了 `https://`）。改完要 `sudo systemctl restart futu-bridge` |
| OpenD 突然全部查詢都失敗 | 可能又需要驗證碼了，照第 8-6 步用 telnet 輸入 |
| VM 不見了或被停止 | 被 Oracle 回收，參考第 12 步 |

---

## 日常維護

更新 bridge 程式碼（在你的電腦執行）：

```powershell
cd D:\portfolio-manager\server\futu-bridge
scp -i $key -r index.js opend.js package.json package-lock.json deploy ubuntu@140.238.1.2:/opt/futu-bridge/
ssh -i $key ubuntu@140.238.1.2 "cd /opt/futu-bridge && npm ci --omit=dev && sudo systemctl restart futu-bridge"
```

更新 OpenD：在下載頁找到新版本號（頁面上看得到檔名），依第 8-1 步把網址換成新檔名下載，**保留舊的 `FutuOpenD.xml`**，覆蓋其他檔案後執行 `sudo systemctl restart opend`。

查看 log：

```bash
ls -t ~/.com.futunn.FutuOpenD/Log/   # OpenD 自己的 log
journalctl -u futu-bridge -f
journalctl -u caddy -f
```
