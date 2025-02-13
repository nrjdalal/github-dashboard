#!/usr/bin/env node
import fs from "node:fs"
import { parseArgs } from "node:util"
import { getRepos } from "@/utils/get-repos"
import { author, name, version } from "~/package.json"

const helpMessage = `Version:
  ${name}@${version}

Usage:
  $ ${name} <owner> [options]

Options:
  -c, --columns  Properties for columns
  -d, --dropdown Properties for dropdown
  -e, --exclude  Exclude repos with names
  -f, --filter    Filter repos with properties
  -v, --version  Display version
  -h, --help     Display help

Author:
  ${author.name} <${author.email}> (${author.url})`

const parse: typeof parseArgs = (config) => {
  try {
    return parseArgs(config)
  } catch (err: any) {
    throw new Error(`Error parsing arguments: ${err.message}`)
  }
}

const main = async () => {
  try {
    const args = process.argv.slice(2)

    if (!args.length) throw new Error("Error invalid usage")

    const { positionals, values } = parse({
      allowPositionals: true,
      options: {
        columns: {
          type: "string",
          multiple: true,
          short: "c",
          default: ["stargazers_count", "forks_count", "open_issues", "npm"],
        },
        dropdown: {
          type: "string",
          multiple: true,
          short: "d",
          default: ["description"],
        },
        exclude: {
          type: "string",
          multiple: true,
          short: "e",
          default: ["none"],
        },
        filter: {
          type: "string",
          multiple: true,
          short: "f",
          default: ["fork"],
        },
        help: { type: "boolean", short: "h" },
        version: { type: "boolean", short: "v" },
      },
    })

    if (values.version) {
      console.log(`${name}@${version}`)
      process.exit(0)
    }

    if (values.help) {
      console.log(helpMessage)
      process.exit(0)
    }

    let repos = (await getRepos(positionals[0])) as any

    // ~ handle filter

    if (values.filter.includes("none")) {
      values.filter = []
    }

    values.filter.forEach((prop: string) => {
      repos = repos.filter((repo: any) => !repo[prop])
    })

    // ~ handle exclude

    if (values.exclude.includes("none")) {
      values.exclude = []
    }

    values.exclude.forEach((name: string) => {
      repos = repos.filter((repo: any) => repo.name !== name)
    })

    // ~ sort by date

    repos = repos.sort(
      (a: any, b: any) =>
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
    )

    const recents = repos.slice(0, 10)
    const popular = repos
      .slice(10)
      .sort((a: any, b: any) => b.stargazers_count - a.stargazers_count)
      .slice(0, 10)

    repos = [...recents, ...popular]

    const npmData = (
      await (
        await fetch(
          `https://registry.npmjs.org/-/v1/search?text=author:${positionals[0]}&size=1000`,
        )
      ).json()
    ).objects

    // ~ add npm if exists

    for (const repo of repos) {
      repo.columns = {
        stargazers_count: repo.stargazers_count ? repo.stargazers_count : "",
        forks_count: repo.forks_count ? repo.forks_count : "",
        open_issues: repo.open_issues ? repo.open_issues : "",
        npm: npmData.find((npm: any) =>
          npm?.package?.links?.repository?.includes("/" + repo.name),
        )
          ? npmData.find((npm: any) =>
              npm?.package?.links?.repository?.includes(repo.name),
            ).downloads.weekly
          : "",
      }

      repo.dropdown = {
        description: repo.description ? `<p>${repo.description}</p>` : "",
        created: repo.created_at,
        updated: repo.updated_at,
      }
    }

    let render =
      `| Repository | ${values.columns.join(" | ")} | Information |\n| :---: | ${values.columns.map(() => " :---: ").join(" | ")} | :---: |\n`
        .replace("stargazers_count", "Stars")
        .replace("forks_count", "Forks")
        .replace("open_issues", "Issues")
        .replace("npm", "NPM") +
      repos
        .map((repo: any) => {
          return `| ${repo.name} | ${values.columns.map((prop: string) => repo.columns[prop]).join(" | ")} | <details><summary><a href="https://github.com/${positionals[0]}/${repo.name}">Link</a></summary><br/>${repo.dropdown.description}<p>Created: ${new Date(repo.dropdown.created).toDateString()}</p><p>Updated: ${new Date(repo.dropdown.updated).toDateString()}</p></details> |`
        })
        .join("\n")

    try {
      const file = fs.readFileSync("README.md", "utf8")
      const start = file.indexOf("<!-- nrjdalal/github-dashboard -->")
      const end = file.indexOf("<!-- nrjdalal/github-dashboard -->", start + 1)
      const updatedReadme =
        file.slice(0, start + 34) + "\n\n" + render + "\n\n" + file.slice(end)
      fs.writeFileSync("README.md", updatedReadme)
    } catch (err: any) {
      fs.writeFileSync(
        "README.md",
        `# GitHub Dashboard\n\n<!-- prettier-ignore-start -->\n<!-- nrjdalal/github-dashboard -->\n\n${render}\n\n<!-- nrjdalal/github-dashboard -->\n<!-- prettier-ignore-end -->\n`,
      )
    }

    process.exit(0)
  } catch (err: any) {
    console.error(helpMessage)
    console.error(`\n${err.message}\n`)
    process.exit(1)
  }
}

main()
