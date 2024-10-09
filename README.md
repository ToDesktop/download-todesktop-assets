# Download ToDesktop Assets

**`download-todesktop-assets`** is a CLI tool to automate the process of downloading build assets from ToDesktop. By providing an `appId` and `buildId`, the CLI fetches JSON metadata from specified URLs, parses the asset information, and downloads all associated files. Additionally, it supports filtering downloads based on platform flags (`--mac`, `--linux`, `--windows`) and organizes certain assets into designated subdirectories for better file management.

## Installation

```bash
npm install -g download-todesktop-assets
```

## Usage

### Command-Line Arguments

- `--appId` (string, **required**): The Application ID.
- `--buildId` (string, **required**): The Build ID.
- `--mac` (boolean, optional): Download only Mac assets.
- `--linux` (boolean, optional): Download only Linux assets.
- `--windows` (boolean, optional): Download only Windows assets.
- `-h, --help` (boolean, optional): Display help information.

### Examples

#### 1. Download All Assets

Download all assets across Mac, Linux, and Windows platforms.

```bash
download-todesktop-assets --appId=240113mzl4weu91 --buildId=24092644c4nvko7
```

#### 2. Download Only Mac and Windows Assets

```bash
download-todesktop-assets --appId=240113mzl4weu91 --buildId=24092644c4nvko7 --mac --windows
```

#### 3. Download Only Linux Assets

```bash
download-todesktop-assets --appId=240113mzl4weu91 --buildId=24092644c4nvko7 --linux
```

## Directory Structure

After executing the CLI, the downloaded files will be organized as follows:

```
downloads/
│ └── 240113mzl4weu91/
│     └── 24092644c4nvko7/
│         ├── td-latest-build-24092644c4nvko7.json
│         ├── td-latest-linux-build-24092644c4nvko7.json
│         ├── td-latest-mac-build-24092644c4nvko7.json
│         ├── My App Setup 0.41.4 - Build 24092644c4nvko7-arm64.exe
│         ├── My App Setup 0.41.4 - Build 24092644c4nvko7.exe
│         ├── My App Setup 0.41.4 - Build 24092644c4nvko7-x64.exe
│         ├── nsis-web/
│         │   ├── My App Setup 0.41.4 - Build 24092644c4nvko7-arm64.exe
│         │   ├── My App Setup 0.41.4 - Build 24092644c4nvko7.exe
│         │   └── My App Setup 0.41.4 - Build 24092644c4nvko7-x64.exe
│         ├── nsis-web-7z/
│         │   ├── My App-0.41.4-arm64.nsis.7z
│         │   └── My App-0.41.4-x64.nsis.7z
│         ├── latest-build-24092644c4nvko7.yml
│         ├── latest-linux-build-24092644c4nvko7.yml
│         └── latest-mac-build-24092644c4nvko7.yml
```

- **`downloads/{appId}/{buildId}/`**: Main directory containing all downloaded assets.
  - **`nsis-web/`**: Subdirectory for `"nsis-web"` category assets.
  - **`nsis-web-7z/`**: Subdirectory for `"nsis-web-7z"` category assets.
  - **JSON and YML Files**: Metadata and configuration files related to the build.

## License

This project is licensed under the MIT License. You are free to use, modify, and distribute it as per the license terms.
