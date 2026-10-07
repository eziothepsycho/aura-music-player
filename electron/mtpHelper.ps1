param(
    [string]$Action = "list-devices",
    [string]$DeviceName = "",
    [string]$DestDir = "",
    [string]$TrackNames = ""
)

$ErrorActionPreference = "SilentlyContinue"

function Get-ConnectedDevices {
    $shell = New-Object -ComObject Shell.Application
    $computer = $shell.NameSpace(17) # 17 = ssfDRIVES
    $devices = @()

    foreach ($item in $computer.Items()) {
        $path = "$($item.Path)"
        # Match MTP portable devices
        if ($path.StartsWith("::{20D04FE0-") -or $item.Type -like "*Portable Device*" -or $item.Type -like "*Phone*") {
            $devices += @{
                name = "$($item.Name)"
                path = $path
            }
        }
    }

    $devices | ConvertTo-Json -Compress
}

function Scan-DeviceAudio([string]$targetName) {
    $shell = New-Object -ComObject Shell.Application
    $computer = $shell.NameSpace(17)
    $phone = $null

    foreach ($item in $computer.Items()) {
        if ($item.Name -like "*$targetName*") {
            $phone = $item
            break
        }
    }

    if ($null -eq $phone) {
        Write-Output "[]"
        return
    }

    $exts = @(".mp3", ".flac", ".wav", ".m4a", ".ogg", ".aac", ".wma", ".opus")
    $audioList = [System.Collections.Generic.List[PSCustomObject]]::new()

    function Recurse-Folder($folder, [int]$depth) {
        if ($depth -gt 5 -or $null -eq $folder) { return }

        foreach ($child in $folder.Items()) {
            if ($child.IsFolder) {
                $cName = $child.Name.ToLower()
                if ($cName -ne "android" -and $cName -ne ".thumbnails" -and -not $cName.StartsWith(".")) {
                    Recurse-Folder $child.GetFolder ($depth + 1)
                }
            } else {
                $ext = [System.IO.Path]::GetExtension($child.Name).ToLower()
                if ($exts -contains $ext) {
                    $audioList.Add([PSCustomObject]@{
                        name = "$($child.Name)"
                        size = [int64]$child.Size
                        folder = "$($folder.Title)"
                    })
                }
            }
        }
    }

    $phoneFolder = $phone.GetFolder
    foreach ($storage in $phoneFolder.Items()) {
        if ($storage.IsFolder) {
            Recurse-Folder $storage.GetFolder 0
        }
    }

    $audioList | ConvertTo-Json -Compress
}

function Copy-DeviceTracks([string]$targetName, [string]$namesCsv, [string]$destination) {
    if (-not (Test-Path $destination)) {
        New-Item -ItemType Directory -Path $destination -Force | Out-Null
    }

    $shell = New-Object -ComObject Shell.Application
    $destFolder = $shell.NameSpace($destination)
    if ($null -eq $destFolder) {
        Write-Output '{"success": false, "error": "Destination folder invalid"}'
        return
    }

    $phone = $null
    foreach ($item in $shell.NameSpace(17).Items()) {
        if ($item.Name -like "*$targetName*") {
            $phone = $item
            break
        }
    }

    if ($null -eq $phone) {
        Write-Output '{"success": false, "error": "Phone not found"}'
        return
    }

    $namesList = $namesCsv -split "\|"
    $copiedCount = 0

    function Copy-MatchingFiles($folder) {
        foreach ($child in $folder.Items()) {
            if ($child.IsFolder) {
                $cName = $child.Name.ToLower()
                if ($cName -ne "android" -and -not $cName.StartsWith(".")) {
                    Copy-MatchingFiles $child.GetFolder
                }
            } else {
                if ($namesList -contains $child.Name) {
                    # 16 = FOF_NOCONFIRMATION, 512 = FOF_NOERRORUI
                    $destFolder.CopyHere($child, 528)
                    $script:copiedCount++
                }
            }
        }
    }

    foreach ($storage in $phone.GetFolder.Items()) {
        if ($storage.IsFolder) {
            Copy-MatchingFiles $storage.GetFolder
        }
    }

    # Wait for file transfers to settle
    Start-Sleep -Seconds 2

    Write-Output "{""success"": true, ""copiedCount"": $copiedCount}"
}

switch ($Action) {
    "list-devices" {
        Get-ConnectedDevices
    }
    "scan-audio" {
        Scan-DeviceAudio $DeviceName
    }
    "copy-tracks" {
        Copy-DeviceTracks $DeviceName $TrackNames $DestDir
    }
    default {
        Write-Output "{}"
    }
}

