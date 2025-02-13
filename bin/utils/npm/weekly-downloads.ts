export const weeklyDownloads = async (packageName: string): Promise<number> => {
  const response = await fetch(
    `https://api.npmjs.org/downloads/point/last-week/${packageName}`,
  )
  const data = await response.json()
  return data.downloads
}
