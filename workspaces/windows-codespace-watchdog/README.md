# Windows Codespace Watchdog — User Manual

**Revision:** 1.0 · 2026-11-17
**Repository:** BestNameYet/Terminals
**Purpose:** Automatically restart the Terminals Codespace when GitHub reports it is shut down, using a personal Windows laptop.

## 1. Installed configuration

| Setting | Value |
| --- | --- |
| Windows scheduled task | Codespace-MCP-Watchdog |
| Target repository | BestNameYet/Terminals |
| Codespace machine name | shiny-robot-v64x5jj4v4q2x96 |
| Check interval | 1 minute, repeating indefinitely while eligible |
| Job execution limit | 2 minutes (original installation setting) |
| Transport | HTTPS, via GitHub CLI REST API |
| Trigger condition | GitHub state exactly Shutdown |
| Launcher | Windows Script Host (wscript.exe), silent.vbs |
| Script | %LOCALAPPDATA%\CodespaceWatchdog\watchdog.ps1 |
| Launcher file | %LOCALAPPDATA%\CodespaceWatchdog\silent.vbs |
| Log | %LOCALAPPDATA%\CodespaceWatchdog\watchdog.log |
| Account | Current Windows user, interactive logon |
| Overlapping checks | Ignore new instance |
| Power behavior | Allowed on battery; start when available |

These values are reconstructed from the installation commands and laptop screenshots in the November 17, 2026 conversation. The laptop was not remotely inspected while preparing this manual. Verify the current settings using section 4. The Codespace machine name may change if the Codespace is replaced.

## 2. How it works

~~~text
Windows Task Scheduler (60-second recurrence)
    |
    v
wscript.exe //B //NoLogo silent.vbs
    |
    v
powershell.exe (hidden, waits for script completion)
    |
    v
watchdog.ps1 -> gh api GET /user/codespaces/{name}
    |
    +-- request fails / state missing -> append ERROR; exit 1
    |
    +-- state == Shutdown -> POST /user/codespaces/{name}/start
    |      +-- accepted -> append start request accepted; exit 0
    |      +-- failed -> append ERROR; exit 1
    |
    +-- any other state -> log state; exit 0
~~~

The PowerShell process exits after each check. Task Scheduler provides repetition; there is no continuously running PowerShell loop. GitHub CLI uses the user's saved authentication and communicates over HTTPS. No SSH, MCP polling, or direct server restart is involved.

The state check does not wait for startup to complete. A later scheduled invocation observes the new state. The existing Codespace startup mechanism is responsible for starting the MCP server; the watchdog does not prove MCP availability. An accepted start request is not itself proof of recovery.

The silent VBScript wrapper launches PowerShell with window mode 0 and waits for its exit code. This addresses the brief flashing console that can occur with PowerShell's -WindowStyle Hidden alone.

## 3. Requirements and initial setup

Run commands in Windows PowerShell on the laptop, using the same Windows account as the scheduled task. If GitHub CLI is not installed, install it, then reopen PowerShell.

~~~powershell
winget install --id GitHub.cli
gh auth login --hostname github.com --web --scopes codespace
~~~

For an existing login lacking the scope:

~~~powershell
gh auth refresh -h github.com -s codespace
~~~

Check the authenticated account and its Codespaces:

~~~powershell
gh auth status --hostname github.com
gh codespace list
gh api user/codespaces --jq '.codespaces[] | {name, state, repository: .repository.full_name}'
~~~

Use the complete machine name, not the abbreviated display name. Do not save credentials or tokens in the scripts or repository.

Keep the laptop awake and connected to the internet. On Windows, set Settings > System > Power & battery > Screen and sleep so the laptop does not sleep while plugged in. The screen may turn off. The task uses interactive logon: locking Windows or closing PowerShell does not stop it, but signing out, sleeping or shutting down prevents regular execution. A closed lid may cause sleep depending on its configured action.

## 4. Daily operation and inspection

~~~powershell
# Read task state and execution results.
Get-ScheduledTask -TaskName 'Codespace-MCP-Watchdog'
Get-ScheduledTaskInfo -TaskName 'Codespace-MCP-Watchdog'

# Inspect the actual recurrence (PT1M = one minute).
(Get-ScheduledTask -TaskName 'Codespace-MCP-Watchdog').Triggers.Repetition | Format-List *

# Inspect launcher, task principal, and execution settings.
$Task = Get-ScheduledTask -TaskName 'Codespace-MCP-Watchdog'
$Task.Actions | Format-List *
$Task.Principal | Format-List *
$Task.Settings | Format-List *

# Inspect the actual local scripts.
Get-Content "$env:LOCALAPPDATA\CodespaceWatchdog\watchdog.ps1"
Get-Content "$env:LOCALAPPDATA\CodespaceWatchdog\silent.vbs"

# Follow the most recent five lines of the log.
Get-Content "$env:LOCALAPPDATA\CodespaceWatchdog\watchdog.log" -Tail 5 -Wait
~~~

Press Ctrl+C to exit log monitoring. It does not stop the watchdog.

LastTaskResult 0 means that the last job completed successfully. LastRunTime and NextRunTime show the previous and planned next invocation. NumberOfMissedRuns reports missed task executions. Inspect the log to determine whether a particular invocation did anything.

~~~powershell
# Run immediately, without altering the next regular trigger.
Start-ScheduledTask -TaskName 'Codespace-MCP-Watchdog'

# Disable future runs; wait for any active run or stop it explicitly.
Disable-ScheduledTask -TaskName 'Codespace-MCP-Watchdog'
Stop-ScheduledTask -TaskName 'Codespace-MCP-Watchdog'

# Re-enable future runs.
Enable-ScheduledTask -TaskName 'Codespace-MCP-Watchdog'

# Manually check the Codespace via HTTPS (read-only).
gh api user/codespaces/shiny-robot-v64x5jj4v4q2x96 --jq '.state'
~~~

Stop-ScheduledTask stops a running watchdog invocation, not the Codespace. Disabling the laptop task does not disable the separate GitHub Actions watchdog.

## 5. Change recurrence or execution limit

Copy a complete block into PowerShell. The following changes only the recurrence; adjust $Minutes to the desired integer (1 or greater).

~~~powershell
& {
    $ErrorActionPreference = 'Stop'
    $Minutes = 1
    $TaskName = 'Codespace-MCP-Watchdog'
    $Trigger = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(1) -RepetitionInterval (New-TimeSpan -Minutes $Minutes)
    Set-ScheduledTask -TaskName $TaskName -Trigger $Trigger | Out-Null
    (Get-ScheduledTask -TaskName $TaskName).Triggers.Repetition | Format-List *
    Get-ScheduledTaskInfo -TaskName $TaskName
}
~~~

The execution limit is separate from the recurrence. It caps the duration of one invocation; it is not how long the Codespace can stay idle. To change the existing limit while preserving other settings:

~~~powershell
& {
    $ErrorActionPreference = 'Stop'
    $TaskName = 'Codespace-MCP-Watchdog'
    $Task = Get-ScheduledTask -TaskName $TaskName
    $Settings = $Task.Settings
    $Settings.ExecutionTimeLimit = 'PT2M'
    Set-ScheduledTask -TaskName $TaskName -Settings $Settings | Out-Null
    (Get-ScheduledTask -TaskName $TaskName).Settings.ExecutionTimeLimit
}
~~~

PT2M means two minutes. An invocation that runs longer than the repetition interval may cause the next check to be skipped because overlapping instances are ignored.

## 6. Change the target Codespace or restore the silent launcher

The Codespace parameter is now inside silent.vbs, not in the task action arguments. Editing the task action as if it directly called PowerShell will not update this target.

Run the following complete block to discover the current Terminals Codespace, verify it, recreate the silent launcher with its full name and retain the existing trigger and settings. It stops without modifying the configuration if the repository has zero or multiple matching Codespaces. If there are multiple, use gh codespace list and change the selection to a specific complete name.

~~~powershell
& {
    $ErrorActionPreference = 'Stop'
    $TaskName = 'Codespace-MCP-Watchdog'
    $Raw = gh api 'user/codespaces?per_page=100'
    if ($LASTEXITCODE -ne 0) { throw 'Codespace lookup failed' }
    $Data = $Raw | ConvertFrom-Json
    if ($Data.total_count -gt 100) { throw 'More than 100 Codespaces; select a full name manually.' }
    $Matches = @($Data.codespaces | Where-Object {
        $_.repository.full_name -eq 'BestNameYet/Terminals'
    })
    if ($Matches.Count -ne 1) { throw "Found $($Matches.Count) matching Codespaces" }
    $Name = $Matches[0].name
    $State = gh api "user/codespaces/$Name" --jq '.state'
    if ($LASTEXITCODE -ne 0 -or -not $State) { throw 'Codespace verification failed' }

    $Folder = Join-Path $env:LOCALAPPDATA 'CodespaceWatchdog'
    $Script = Join-Path $Folder 'watchdog.ps1'
    $Wrapper = Join-Path $Folder 'silent.vbs'
    if (-not (Test-Path -LiteralPath $Script)) { throw 'Watchdog script missing' }
    $Gh = (Get-Command gh.exe -ErrorAction Stop).Source
    $PowerShell = "$env:SystemRoot\System32\WindowsPowerShell\v1.0\powershell.exe"
    $Arguments = '-NoProfile -NonInteractive -WindowStyle Hidden -ExecutionPolicy RemoteSigned -File "{0}" -Codespace "{1}" -GhPath "{2}"' -f $Script, $Name, $Gh
    $Command = ('"{0}" {1}' -f $PowerShell, $Arguments).Replace('"', '""')
    @"
Set shell = CreateObject("WScript.Shell")
WScript.Quit shell.Run("$Command", 0, True)
"@ | Set-Content -LiteralPath $Wrapper -Encoding Unicode

    $Action = New-ScheduledTaskAction -Execute "$env:SystemRoot\System32\wscript.exe" -Argument ('//B //NoLogo "{0}"' -f $Wrapper)
    Set-ScheduledTask -TaskName $TaskName -Action $Action | Out-Null
    Start-ScheduledTask -TaskName $TaskName
    Write-Host "Codespace: $Name; state: $State"
}
~~~

This is a maintenance adaptation of the tested commands, not a newly executed laptop test. After changing the target, inspect the log and NextRunTime. Windows Script Host and VBScript must be available; if unavailable, the original visible PowerShell task action can be restored by constructing an action using powershell.exe and the same $Arguments above rather than wscript.exe.

## 7. Watchdog script (installed logic)

The following is the original PowerShell script content from the installation procedure. The later fixes changed the task's Codespace argument, recurrence and launcher; they did not change this script.

~~~powershell
param(
    [string]$Codespace,
    [string]$GhPath
)

$Log = Join-Path $PSScriptRoot 'watchdog.log'

function Write-Log($Message) {
    Add-Content -Path $Log -Value (
        "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') $Message"
    )
}

try {
    $Endpoint = "user/codespaces/$Codespace"
    $State = & $GhPath api --hostname github.com --method GET $Endpoint --jq '.state'

    if ($LASTEXITCODE -ne 0 -or -not $State) {
        throw 'Unable to retrieve Codespace state'
    }

    Write-Log "State: $State"

    if ($State -eq 'Shutdown') {
        & $GhPath api --hostname github.com --method POST "$Endpoint/start" | Out-Null

        if ($LASTEXITCODE -ne 0) {
            throw 'Codespace start request failed'
        }

        Write-Log 'Start request accepted'
    }

    exit 0
}
catch {
    Write-Log "ERROR: $_"
    exit 1
}
~~~

Edit the file only when changing the actual watchdog logic:

~~~powershell
notepad "$env:LOCALAPPDATA\CodespaceWatchdog\watchdog.ps1"
~~~

Preserve the parameter interface, state check and exit codes. Back up the file before changing it. The next invocation loads the updated file; there is no resident PowerShell process that needs restarting.

## 8. Reinstall from scratch

Use section 3 first. Then paste this block in Windows PowerShell to create the task and its two files. It refuses to overwrite an existing registered task or watchdog script, so use maintenance sections for an existing deployment. It uses the same verified design but the combined installer below has not been executed on the laptop as a single unit.

~~~powershell
& {
    $ErrorActionPreference = 'Stop'
    $TaskName = 'Codespace-MCP-Watchdog'
    $Folder = Join-Path $env:LOCALAPPDATA 'CodespaceWatchdog'
    $Script = Join-Path $Folder 'watchdog.ps1'
    $Wrapper = Join-Path $Folder 'silent.vbs'
    if (Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue) { throw 'Task already exists; use maintenance commands.' }
    if ((Test-Path -LiteralPath $Script) -or (Test-Path -LiteralPath $Wrapper)) { throw 'Existing watchdog files; back them up before reinstalling.' }

    $Gh = (Get-Command gh.exe -ErrorAction Stop).Source
    $Raw = & $Gh api 'user/codespaces?per_page=100'
    if ($LASTEXITCODE -ne 0) { throw 'Codespace lookup failed' }
    $Data = $Raw | ConvertFrom-Json
    if ($Data.total_count -gt 100) { throw 'More than 100 Codespaces; select manually.' }
    $Matches = @($Data.codespaces | Where-Object { $_.repository.full_name -eq 'BestNameYet/Terminals' })
    if ($Matches.Count -ne 1) { throw "Found $($Matches.Count) matching Codespaces" }
    $Name = $Matches[0].name
    $State = & $Gh api "user/codespaces/$Name" --jq '.state'
    if ($LASTEXITCODE -ne 0 -or -not $State) { throw 'Codespace verification failed' }

    New-Item -ItemType Directory -Path $Folder -Force | Out-Null
    @'
param([string]$Codespace, [string]$GhPath)
$Log = Join-Path $PSScriptRoot 'watchdog.log'
function Write-Log($Message) {
    Add-Content -Path $Log -Value "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') $Message"
}
try {
    $Endpoint = "user/codespaces/$Codespace"
    $State = & $GhPath api --hostname github.com --method GET $Endpoint --jq '.state'
    if ($LASTEXITCODE -ne 0 -or -not $State) { throw 'Unable to retrieve Codespace state' }
    Write-Log "State: $State"
    if ($State -eq 'Shutdown') {
        & $GhPath api --hostname github.com --method POST "$Endpoint/start" | Out-Null
        if ($LASTEXITCODE -ne 0) { throw 'Codespace start request failed' }
        Write-Log 'Start request accepted'
    }
    exit 0
}
catch {
    Write-Log "ERROR: $_"
    exit 1
}
'@ | Set-Content -LiteralPath $Script -Encoding UTF8

    $PowerShell = "$env:SystemRoot\System32\WindowsPowerShell\v1.0\powershell.exe"
    $Arguments = '-NoProfile -NonInteractive -WindowStyle Hidden -ExecutionPolicy RemoteSigned -File "{0}" -Codespace "{1}" -GhPath "{2}"' -f $Script, $Name, $Gh
    $Command = ('"{0}" {1}' -f $PowerShell, $Arguments).Replace('"', '""')
    @"
Set shell = CreateObject("WScript.Shell")
WScript.Quit shell.Run("$Command", 0, True)
"@ | Set-Content -LiteralPath $Wrapper -Encoding Unicode

    $Action = New-ScheduledTaskAction -Execute "$env:SystemRoot\System32\wscript.exe" -Argument ('//B //NoLogo "{0}"' -f $Wrapper)
    $Trigger = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(1) -RepetitionInterval (New-TimeSpan -Minutes 1)
    $Settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Minutes 2)
    $Principal = New-ScheduledTaskPrincipal -UserId ([System.Security.Principal.WindowsIdentity]::GetCurrent().Name) -LogonType Interactive
    Register-ScheduledTask -TaskName $TaskName -Action $Action -Trigger $Trigger -Settings $Settings -Principal $Principal | Out-Null
    Start-ScheduledTask -TaskName $TaskName
    Get-ScheduledTaskInfo -TaskName $TaskName
}
~~~

If a partial installation writes the files but fails to register the task, inspect the error and back up the files before repeating the installation. Confirm a fresh state entry in the log.

## 9. Recovery test and observed results

To test recovery, leave the laptop watchdog enabled. Stop the Codespace from the laptop:

~~~powershell
gh codespace stop -c shiny-robot-v64x5jj4v4q2x96
Get-Content "$env:LOCALAPPDATA\CodespaceWatchdog\watchdog.log" -Tail 5 -Wait
~~~

Or stop it from a shell inside the Codespace:

~~~bash
gh codespace stop -c "$CODESPACE_NAME"
~~~

Do not reopen the Codespace during the test; that may start it independently. If isolating the laptop watchdog is essential, ensure the GitHub Actions fallback does not execute concurrently. The stop operation disconnects active sessions, so save work before testing.

Observed laptop log, November 17, 2026 (local Windows time):

~~~text
2026-11-17 01:28:29 State: Shutdown
2026-11-17 01:28:30 Start request accepted
2026-11-17 01:29:30 State: Available
~~~

The laptop detected Shutdown, obtained start acceptance one second later, and observed Available at the next check (61 seconds from detection). This does not identify the exact instant of startup or verify MCP server readiness.

After adding the silent launcher, a manual scheduled-task invocation produced:

~~~text
2026-11-17 13:11:57 State: Available
~~~

The screenshot verifies that the new launcher can run the watchdog successfully; it does not independently establish that all future scheduled executions are visually silent.

## 10. Troubleshooting

| Symptom | What to check / do |
| --- | --- |
| ERROR: Unable to retrieve Codespace state | Run the direct API request below to expose the actual HTTP response. |
| HTTP 404 | Use the full machine name and check the authenticated account; the short name shiny-robot returned 404 during initial setup. |
| HTTP 401 / 403 | Inspect gh auth status and Codespaces scope/access; do not change authentication when the problem is only the name. |
| HTTP 429 | Inspect response headers; avoid rapid manual retries. |
| function not defined: Terminals/0 | Windows PowerShell mangled the quotes in the jq repository filter; use ConvertFrom-Json and Where-Object as above. |
| No new log entries | Inspect task state, LastTaskResult, NextRunTime, Windows sleep/logon, internet access, script and launcher paths. |
| PowerShell window flashes | Confirm task action is wscript.exe with silent.vbs and that VBScript is available. |
| State Shutdown but no acceptance | Run direct diagnostic for the POST only when intentionally starting the Codespace; inspect errors. |
| Available but MCP unavailable | Separate server startup issue; this watchdog only checks Codespace state. |
| Codespace will not stay stopped | Disable both laptop and any independently active GitHub Actions watchdog before stopping it. |

~~~powershell
# Read-only HTTP diagnostic (does not print an authorization token).
gh api --method GET user/codespaces/shiny-robot-v64x5jj4v4q2x96 --include

# Explicit manual start (changes Codespace state).
gh api --method POST user/codespaces/shiny-robot-v64x5jj4v4q2x96/start
~~~

If log growth becomes excessive, disable the scheduled task, wait for its current invocation to finish, archive or rename watchdog.log and re-enable the task. The next invocation creates a new log. Log rotation is not implemented in the current script.

To uninstall the scheduled task while retaining its scripts and logs:

~~~powershell
Disable-ScheduledTask -TaskName 'Codespace-MCP-Watchdog'
Stop-ScheduledTask -TaskName 'Codespace-MCP-Watchdog'
Unregister-ScheduledTask -TaskName 'Codespace-MCP-Watchdog' -Confirm:$false
~~~

## 11. GitHub Actions fallback

The repository also contains [.github/workflows/codespace-mcp-watchdog.yml](../../.github/workflows/codespace-mcp-watchdog.yml). At the time of documentation its state-check/start logic remains the same. The cron expression is 7-56/7 * * * * (eight intended invocations per hour, with an eleven-minute boundary gap), the Actions job execution limit is eight minutes, and manual dispatch is enabled. It uses the repository secret CODESPACES_PAT and MCP_CODESPACE_NAME variable (falling back to shiny-robot). The variable's actual value was not inspected.

Earlier examination of Actions history found gaps of several hours between scheduled runs, which motivated the laptop watchdog. The fallback can independently start the same Codespace; it is not necessary for local scheduling.

~~~powershell
# Inspect GitHub Actions history.
gh run list --repo BestNameYet/Terminals --workflow codespace-mcp-watchdog.yml --limit 10

# Optional: disable / enable only the GitHub Actions fallback.
gh workflow disable codespace-mcp-watchdog.yml --repo BestNameYet/Terminals
gh workflow enable codespace-mcp-watchdog.yml --repo BestNameYet/Terminals
~~~

The GitHub Actions fallback is separate from the Windows task; changing one does not change the other. Continuously restarting a Codespace can consume compute quota or incur charges.

## 12. Scope and provenance

Sources: November 17, 2026 installation, repair, recurrence change, recovery test and silent-launcher conversation and screenshots; current repository watchdog YAML. Commands for reinstalling, changing settings and diagnosis are provided for maintenance; they were not newly run against the laptop during documentation. No laptop settings, server code or workflow configuration were changed to produce this manual.
