export const getRepos = async (owner: string): Promise<string[]> => {
  const repos: string[] = []
  let page = 1
  let hasNextPage = true

  while (hasNextPage) {
    const response = await fetch(
      `https://api.github.com/users/${owner}/repos?per_page=100&page=${page}`,
      {
        headers: {
          Accept: "application/vnd.github+json",
        },
      },
    )

    if (!response.ok) {
      throw new Error(`Failed to fetch repos: ${response.statusText}`)
    }

    const newRepos = await response.json()
    repos.push(...newRepos)

    const linkHeader = response.headers.get("link")
    hasNextPage = linkHeader ? linkHeader.includes('rel="next"') : false
    page++
  }

  return repos
}
