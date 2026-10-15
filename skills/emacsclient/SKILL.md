---
name: emacsclient
description: 'Always use emacsclient instead of emacs. This applies to all Emacs operations: user requests, byte compilation, check-parens, running ERT tests, and any other elisp evaluation.'
tools: Bash
---

# Always use emacsclient

The user has an Emacs server running. **All** Emacs operations must go through `emacsclient`, never `emacs` or `emacs --batch`. This includes both user-requested actions and agent-initiated operations like byte compilation, syntax checking, or running tests.

## Examples

- Open a file: `emacsclient --no-wait "/path/to/file"`
- Evaluate elisp: `emacsclient --eval '(some-function)'`
- Open at a line: `emacsclient --no-wait +42 "/path/to/file"`
- Byte compile a file:
  ```sh
  emacsclient --eval '
  (byte-compile-file "/path/to/file.el")'
  ```
- Check parentheses:
  ```sh
  emacsclient --eval '
  (with-temp-buffer
    (insert-file-contents "/path/to/file.el")
    (check-parens))'
  ```
- Run ERT tests:
  ```sh
  emacsclient --eval '
  (progn
    (load "/path/to/test-file.el" nil t)
    (ert-run-tests-batch "pattern"))'
  ```

## Rules

- Always use `emacsclient`, never `emacs` or `emacs --batch`.
- Use `--no-wait` when opening files so the command returns immediately.
- Use `--eval` when evaluating elisp.
- Always format `--eval` elisp across multiple lines with proper indentation.
- Run `emacsclient` commands via the Bash tool.
- On a live server, never use `ert-run-tests-batch-and-exit` or `kill-emacs`. The exit runner normally rejects interactive use; binding `noninteractive` to bypass that check can terminate the user's editor. Use `ert-run-tests-batch` instead, and keep expensive tests or pixel measurements out of the live session.
