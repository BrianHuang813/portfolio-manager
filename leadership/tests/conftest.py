from pathlib import Path
import sys
import pytest
import yaml

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))


@pytest.fixture
def config():
    return yaml.safe_load((ROOT / 'config.yaml').read_text(encoding='utf-8'))
