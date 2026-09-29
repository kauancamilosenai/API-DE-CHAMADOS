import express from "express"
import pool from './pg.js'

const app = express()

function registrarRequisicao(request, response, next){
    const data = new Date()
    console.log(`|| Data e Hora: [${data.toLocaleString()}] | Método: '${request.method}' | URL: '${request.url}' ||`)
    next();
}

function verificarRequisicao(request, response, next){
    try{
        const {titulo, descricao, setor, prioridade} = request.body
        console.log({titulo, descricao, setor, prioridade})
        next()
    }
    catch(err){
        console.log(err)
        next()
    }
}

app.use(registrarRequisicao)
app.use(express.json())

app.get('/chamar', async (request, response) => {
    try{
        const resultado = await pool.query('SELECT * FROM chamados')
        const {id} = request.query
        const verificar = await pool.query('SELECT * FROM chamados WHERE id = $1', [id])

        if(id){
            if(verificar.rows.length != 0){ return response.status(200).json(verificar.rows) }
            return response.status(400).json("por favor insira um ID valido")
        }
        return response.status(200).json(resultado)
    }
    catch(err){
        return response.status(400).json('error'+ err)
    }
})

app.post('/addThing', verificarRequisicao, async (request, response) => {
    try{
        const {titulo, descricao, setor, prioridade} = request.body
        return response.status(200).json({titulo, descricao, setor, prioridade})
    }
    catch(err){
        return response.status(400).json(err)
    }
})

app.listen(3000)