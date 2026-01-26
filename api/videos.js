export default function handler(req, res) {
  const videos = process.env.C2C_VIDEOS
    ?.split(",")
    .map(v => v.trim());

  res.status(200).json(videos);
}