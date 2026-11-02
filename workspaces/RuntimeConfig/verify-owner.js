"use strict";

const fs = require("node:fs");
const event = JSON.parse(fs.readFileSync(process.env.GITHUB_EVENT_PATH, "utf8"));
const owner = event.repository?.owner;
const author = event.comment?.user;
if (!owner || !author ||
    owner.type !== "User" ||
    !Number.isSafeInteger(owner.id) ||
    !Number.isSafeInteger(author.id) ||
    owner.id !== author.id ||
    typeof owner.login !== "string" ||
    typeof author.login !== "string" ||
    owner.login.toLowerCase() !== author.login.toLowerCase()) {
  throw new Error("Unauthorized comment: repository owner must be the comment author.");
}
console.log("Authorized repository owner comment: " + owner.login);
