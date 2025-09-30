import fs from "fs";

export const json = (body: object | string | number, opts: ResponseInit = {}) =>
  new Response(JSON.stringify(body), {
    headers: {
      "Content-Type": "application/json",
      ...(opts?.headers || {}),
    },
    ...(opts || {}),
  });

export function getNow() {
  return `[ ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} ]`;
}

export function log(
  ...args: (string | boolean | number | undefined | null | object | Error)[]
) {
  const logInConsole = args[0];
  if (logInConsole !== false) console.log(getNow(), ...args);
  fs.writeFileSync(
    "import.log",
    `${getNow()} ${args.length > 1 ? (logInConsole === false ? args.slice(1).join(" ") : args.join(" ")) : args[0]}\n`,
    { encoding: "utf-8", flag: "a" },
  );
}
export function sleep(interval: number) {
  return new Promise((resolve) => setTimeout(resolve, interval));
}
