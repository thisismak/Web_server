import express from 'express'

let server = express()

server.use(express.static('public'))

server.use(express.urlencoded())

server.post('/login', (req, res) => {
  if (req.body.username != 'alice') {
    res.status(401)
    res.send('wrong username')
    return
  }
  if (req.body.password != '123456') {
    res.status(401)
    res.send('wrong password')
    return
  }
  res.end('Login Success')
})

server.get('/logout', (req, res) => {
  res.end('TODO: logout')
})

server.listen(3000)