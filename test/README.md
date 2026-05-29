# Tests

Open `test/runner.html` through a local HTTP server to run the browser flow tests.

Example:

```sh
python3 -m http.server 8939
```

Then visit:

```text
http://127.0.0.1:8939/test/runner.html
```

These tests load the real app in an iframe and exercise mobile user flows:

- generate a plan
- switch from plan to training and back
- edit an existing plan
- add custom exercises
- add extra training items before and after check-in
- render history with saved data
- protect custom text from HTML injection
