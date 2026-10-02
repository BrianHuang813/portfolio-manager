Source: https://github.com/Fred6725/relative-strength
Revision: 84591aabab0b02ccba6dc8e177b0284389108e64
Retrieved: 2026-10-02
License: Apache-2.0 (see LICENSE).

rs_ranking.py is preserved verbatim, including its annual calculation, qcut,
industry aggregation and original CSV generation. rs_data.py has two integration
changes: defer NASDAQ resolution from module import to main(), so cached runs
and unit tests do not access the network; preserve Security Name as company
metadata without altering ticker eligibility. Price fetching is otherwise unchanged
(Yahoo auto_adjust=True: Close is already split/dividend adjusted).

The existing metadata cache is included to avoid thousands of initial company
info requests. It is a source snapshot and gets refreshed by the daily fetcher.
