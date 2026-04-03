#!/usr/bin/env node

import { spawn } from "node:child_process";

const child = spawn(getExePath(), process.argv.slice(2), { stdio: "inherit" });
child.on("close", (code) => {
  if (code !== 0) process.exit(1);
});

function getExePath() {
  try {
    const exePath = import.meta.resolve(
      `go-github-release-demo-${process.platform}-${process.arch}/bin/go-github-release-demo${process.platform === "win32" ? ".exe" : ""}`,
    );
    return exePath;
  } catch {
    console.error(
      `The platform ${process.platform}-${process.arch} is not supported`,
    );
    process.exit(1);
  }
}
