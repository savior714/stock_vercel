# Skills Submodule and Agent Tool Troubleshooting

### Submodule Update Checkout Error (heads/main)

**Symptoms:**
An error or checkout failure occurs when running `git submodule update --remote --merge`, often involving remote branch references.

**Cause:**
This happens when the local submodule's HEAD state is out of sync with the remote, or if there is a pending merge conflict.

**Resolution:**
Navigate to the submodule directory and perform a hard reset to match the remote branch:
```powershell
cd .agent/skills
git fetch origin
git reset --hard origin/main
cd ../..
```
Verify that the commit hash has been updated via `git submodule status`.
