import express from "express"
const app = express()

function registroRequisicao(request, response, next){
    console.log("Middleware ativo")
    const data = new Date()
    console.log(data.toLocateString)
    
    next()
}

app.use(express.json())
app.use(registroRequisicao)

app.get('/', (request, response) => {
    return response.status(200).json("Servidor online")
})

app.listen(3000)