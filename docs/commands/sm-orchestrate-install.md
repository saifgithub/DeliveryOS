# /sm-orchestrate-install — stand up the orchestration protocol in this project

A pointer, deliberately. The interview itself lives in the tree so it travels with `cp -r` of
`orchestration/` and is runnable by any implementation, not just this one.

Read `orchestration/install/INSTALL_INTERVIEW.md` and follow it end to end, starting at phase 0.
Stop when `sh orchestration/install/check_bindings.sh` exits 0 — its exit code is the verdict, not
your summary of it.
