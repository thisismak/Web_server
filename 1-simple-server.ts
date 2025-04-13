import http from 'http'

let server = http.createServer((req, res) => {
  console.log(req.url)
  let date = new Date()
  res.end(`Hello TypeScript. Now is ${date.toLocaleString()}`)
})

server.listen(3000)