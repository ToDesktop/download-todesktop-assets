import axios from "axios";
import * as fs from "fs";
import * as path from "path";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import chalk from "chalk";
import ora, { Ora } from "ora";

interface Artifact {
  [key: string]: ArtifactDetail | null;
}

interface ArtifactDetail {
  path: string;
  url: string;
}

interface Artifacts {
  appx: Artifact | null;
  msi: Artifact | null;
  nsis: Artifact | null;
  "nsis-web": Artifact | null;
  "nsis-web-7z": Artifact | null;
}

interface BuildJSON {
  artifacts: Artifacts;
  createdAt: string;
  version: string;
}

interface Args {
  appId: string;
  buildId: string;
  mac: boolean;
  linux: boolean;
  windows: boolean;
  help: boolean;
}

async function parseArgs(): Promise<Args> {
  const argv = await yargs(hideBin(process.argv))
    .option("appId", {
      type: "string",
      description: "Application ID",
      demandOption: true,
    })
    .option("buildId", {
      type: "string",
      description: "Build ID",
      demandOption: true,
    })
    .option("mac", {
      type: "boolean",
      description: "Download Mac assets",
      default: false,
    })
    .option("linux", {
      type: "boolean",
      description: "Download Linux assets",
      default: false,
    })
    .option("windows", {
      type: "boolean",
      description: "Download Windows assets",
      default: false,
    })
    .help()
    .alias("help", "h").argv;

  return {
    appId: argv.appId,
    buildId: argv.buildId,
    mac: argv.mac,
    linux: argv.linux,
    windows: argv.windows,
    help: argv.help as boolean,
  };
}

function createDownloadDir(appId: string, buildId: string): string {
  const downloadPath = path.join(process.cwd(), "downloads", appId, buildId);
  fs.mkdirSync(downloadPath, { recursive: true });
  return downloadPath;
}

function buildUrls(appId: string, buildId: string): string[] {
  const baseUrl = `https://download.todesktop.com/${appId}`;
  return [
    `${baseUrl}/td-latest-build-${buildId}.json`,
    `${baseUrl}/td-latest-linux-build-${buildId}.json`,
    `${baseUrl}/td-latest-mac-build-${buildId}.json`,
  ];
}

async function downloadFile(
  url: string,
  dest: string,
  spinner: Ora
): Promise<void> {
  const writer = fs.createWriteStream(dest);

  try {
    const response = await axios.get(url, { responseType: "stream" });

    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
      writer.on("finish", resolve);
      writer.on("error", reject);
    });
  } catch (error) {
    spinner.fail(chalk.red(`Failed to download ${url}: ${error}`));
    throw error;
  }
}

async function fetchJSON(url: string, spinner: Ora): Promise<BuildJSON> {
  try {
    const response = await axios.get<BuildJSON>(url);
    return response.data;
  } catch (error) {
    spinner.fail(chalk.red(`Failed to fetch JSON from ${url}: ${error}`));
    throw error;
  }
}

// Define a type to hold asset URL along with its category
interface Asset {
  url: string;
  category: string;
}

function extractDownloadUrls(buildJson: BuildJSON): Asset[] {
  const assets: Asset[] = [];

  const artifacts = buildJson.artifacts;
  for (const category in artifacts) {
    const artifactCategory = artifacts[category as keyof Artifacts];
    if (artifactCategory) {
      for (const subKey in artifactCategory) {
        const artifactDetail = artifactCategory[subKey];
        if (artifactDetail && artifactDetail.url) {
          assets.push({ url: artifactDetail.url, category });
        }
      }
    }
  }

  return assets;
}

function buildYmlUrls(appId: string, buildId: string): string[] {
  const baseUrl = `https://download.todesktop.com/${appId}`;
  return [
    `${baseUrl}/latest-build-${buildId}.yml`,
    `${baseUrl}/latest-linux-build-${buildId}.yml`,
    `${baseUrl}/latest-mac-build-${buildId}.yml`,
  ];
}

function getDestinationPath(downloadDir: string, asset: Asset): string {
  // If the asset belongs to 'nsis-web', place it in the 'nsis-web' subdirectory
  if (asset.category === "nsis-web") {
    const subDir = path.join(downloadDir, "nsis-web");
    if (!fs.existsSync(subDir)) {
      fs.mkdirSync(subDir, { recursive: true });
    }
    return path.join(subDir, path.basename(new URL(asset.url).pathname));
  }
  if (asset.category === "nsis-web-7z") {
    const subDir = path.join(downloadDir, "nsis-web");
    if (!fs.existsSync(subDir)) {
      fs.mkdirSync(subDir, { recursive: true });
    }
    return path.join(subDir, path.basename(new URL(asset.url).pathname));
  }
  // Default: Place in the main download directory
  return path.join(downloadDir, path.basename(new URL(asset.url).pathname));
}

async function main() {
  const args = await parseArgs();

  const spinner = ora("Initializing download...").start();

  try {
    const downloadDir = createDownloadDir(args.appId, args.buildId);
    spinner.succeed(
      chalk.green(`Download directory created at ${downloadDir}`)
    );

    const jsonUrls = buildUrls(args.appId, args.buildId);

    // Apply platform filters
    let filteredJsonUrls = jsonUrls;
    if (args.mac || args.linux || args.windows) {
      filteredJsonUrls = jsonUrls.filter((url) => {
        if (args.mac && url.includes("mac")) return true;
        if (args.linux && url.includes("linux")) return true;
        if (args.windows && !url.includes("mac") && !url.includes("linux"))
          return true;
        return false;
      });
    }

    // Download JSON files
    for (const url of filteredJsonUrls) {
      const fileName = path.basename(url);
      const dest = path.join(downloadDir, fileName);

      spinner.start(`Downloading JSON file: ${fileName}`);
      await downloadFile(url, dest, spinner);
      spinner.succeed(chalk.green(`Downloaded ${fileName}`));
    }

    // Process each JSON file
    for (const url of filteredJsonUrls) {
      const fileName = path.basename(url);

      spinner.start(`Parsing JSON file: ${fileName}`);
      const buildJson = await fetchJSON(url, spinner);
      spinner.succeed(chalk.green(`Parsed ${fileName}`));

      // Extract URLs along with their categories
      const assets = extractDownloadUrls(buildJson);

      // Apply platform filters to asset URLs
      let filteredAssets = assets;
      if (args.mac || args.linux || args.windows) {
        filteredAssets = assets.filter((asset) => {
          const assetUrlLower = asset.url.toLowerCase();
          if (args.mac && assetUrlLower.includes("mac")) return true;
          if (args.linux && assetUrlLower.includes("linux")) return true;
          if (args.windows && assetUrlLower.endsWith(".exe")) return true;
          return false;
        });
      }

      // Download assets
      for (const asset of filteredAssets) {
        const assetDest = getDestinationPath(downloadDir, asset);

        spinner.start(`Downloading asset: ${path.basename(assetDest)}`);
        await downloadFile(asset.url, assetDest, spinner);
        spinner.succeed(chalk.green(`Downloaded ${path.basename(assetDest)}`));
      }
    }

    // Download additional YML files
    const ymlUrls = buildYmlUrls(args.appId, args.buildId);

    // Apply platform filters
    let filteredYmlUrls = ymlUrls;
    if (args.mac || args.linux || args.windows) {
      filteredYmlUrls = ymlUrls.filter((url) => {
        if (args.mac && url.includes("mac")) return true;
        if (args.linux && url.includes("linux")) return true;
        if (args.windows && !url.includes("mac") && !url.includes("linux"))
          return true;
        return false;
      });
    }

    for (const url of filteredYmlUrls) {
      const fileName = path.basename(url);
      const dest = path.join(downloadDir, fileName);

      spinner.start(`Downloading YML file: ${fileName}`);
      await downloadFile(url, dest, spinner);
      spinner.succeed(chalk.green(`Downloaded ${fileName}`));
    }

    console.log(chalk.blue.bold("\nAll downloads completed successfully!"));
  } catch (error) {
    spinner.fail(chalk.red("An error occurred during the download process."));
    console.error(error);
    process.exit(1);
  }
}

main();
