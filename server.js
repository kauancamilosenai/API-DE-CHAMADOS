import express, { request, response } from "express"
import pool from './pg.js'

const app = express()

app.use(registrarRequisicao)
app.use(express.json())




//
// MIDDLEWARES

function registrarRequisicao(request, response, next){
    const data = new Date()
    console.log(`|| Data e Hora: [${data.toLocaleString()}] | Método: '${request.method}' | URL: '${request.url}' ||`)
    next();
}

function verificarRequisicao(request, response, next){
    try{
        const {titulo, descricao, setor, prioridade} = request.body
        if(!titulo){
            return response.status(400).json({Error:'faltando TITULO.'}) 
        }
        if(!descricao){
            return response.status(400).json({Error:'faltando DESCRICAO.'}) 
        }
        if(!setor){
            return response.status(400).json({Error:'faltando SETOR.'}) 
        }
        if(!prioridade){
            return response.status(400).json({Error:'faltando PRIORIDADE.'}) 
        }

        if(prioridade != "baixa" && prioridade != "media" && prioridade != "alta"){
            return response.status(400).json({Error:"PRIORIDADE deve ser 'baixa', 'media' ou 'alta'."})
        }

        next()
    }
    catch(err){
        console.log(err)
        next()
    }
}

function verificarAutenticacao(request, response, next){
    try{
        const listaTokens = {
            looser123:{
                nome: "Looser",
                tipo: "perdedor"
            },
            tecnico123: {
                nome: "Carlos Técnico",
                tipo: "tecnico"
            },
            admin123: {
                nome: "Carlos Administrador",
                tipo: "admin"
            }
        }

        const {token} = request.headers
        const checkToken = listaTokens[token]

        if(!checkToken){
            return response.status(401).json({error: 'token invalido ou não informado'})
        }

        request.token = checkToken;

        next()
    }
    catch(err){
        return response.status(400).json({verificarAutenticacao: err})
    }
}

function somenteAdmin(request, response, next){
    try{
        const listaTokens = {
            looser123:{
                nome: "Looser",
                tipo: "perdedor"
            },
            tecnico123: {
                nome: "Carlos Técnico",
                tipo: "tecnico"
            },
            admin123: {
                nome: "Carlos Administrador",
                tipo: "admin"
            }
        }

        const {token} = request.headers
        const checkToken = listaTokens[token]

        if(checkToken.tipo != 'admin'){
            return response.status(403).json({ERROR: "você não é admin, não tem acesso"})
        }
        next()
    }
    catch(err){
        return response.status(400).json({'ERROR - SomenteAdmin': err})
    }        
}



//
// ROTAS

app.get('/chamar', verificarAutenticacao, async (request, response) => {
    try{
        const token = request.token
        if(token.tipo != "tecnico" && token.tipo != "admin"){ return response.status(401).json({error: "seu token não tem acesso á '/chamar'"})}

        const {status} = request.query
        const {prioridade} = request.query
        //console.log({status, prioridade})

        if(status && prioridade){
            const statusANDprioridadePG = await pool.query('SELECT * FROM chamados WHERE status = $1 and prioridade = $2', [status, prioridade])

            if(statusANDprioridadePG.rows.length == 0){
                return response.status(400).json({'STATUS+PRIORIDADE ERROR': `status: '${status}' e prioridade: '${prioridade}'`})
            }

            return response.status(200).json(statusANDprioridadePG.rows)
        }

        if(status){
            const statusPG = await pool.query('SELECT * FROM chamados WHERE status = $1', [status])

            if(statusPG.rows.length == 0){
                return response.status(400).json({'STATUS ERROR': `status: '${status}'`})
            }
            
            return response.status(200).json(statusPG.rows)
        }

        if(prioridade){
            const prioridadePG = await pool.query('SELECT * FROM chamados WHERE prioridade = $1', [prioridade])

            if(prioridadePG.rows.length == 0){
                return response.status(400).json({'PRIORIDADE ERROR': `status: '${prioridade}'`})
            }
            
            return response.status(200).json(prioridadePG.rows)
        }

        const resultado = await pool.query('SELECT * FROM chamados')
        const {id} = request.query
        const verificar = await pool.query('SELECT * FROM chamados WHERE id = $1', [id])

        if(id){
            if(verificar.rows.length != 0){ return response.status(200).json(verificar.rows) }
            return response.status(400).json("por favor insira um ID valido")
        }
        return response.status(200).json(resultado.rows)
    }
    catch(err){
        return response.status(400).json('error'+ err)
    }
})

app.get('/chamados/estatisticas', verificarAutenticacao, async (request, response) => {
    try{
        const r1 = await pool.query(`SELECT count(id) as "total_de_chamados" FROM chamados`)
        const total_de_chamados = r1.rows[0].total_de_chamados
        
        const r2 = await pool.query(`SELECT count(status) as "total_de_chamados_abertos" FROM chamados  WHERE status = 'aberto'`)
        const total_de_chamados_abertos = r2.rows[0].total_de_chamados_abertos
        
        const r3 = await pool.query(`SELECT count(id) as "total_em_atendimentos" FROM chamados  WHERE status = 'em_atendimento'`)
        const total_em_atendimentos = r3.rows[0].total_em_atendimentos
        
        const r4 = await pool.query(`SELECT count(id) as "total_finalizados" FROM chamados  WHERE status = 'finalizado'`)
        const total_finalizados = r4.rows[0].total_finalizados
        
        const r5 = await pool.query(`SELECT count(id) as "total_com_prioridade_alta" FROM chamados  WHERE prioridade = ''`)
        const total_com_prioridade_alta = r5.rows[0].total_com_prioridade_alta

        return response.status(200).json({total_de_chamados,total_de_chamados_abertos,total_em_atendimentos,total_finalizados,total_com_prioridade_alta})
    }
    catch(err){
        return response.status(400).json('error'+ err)
    }
})

app.post('/chamados/add', verificarAutenticacao, verificarRequisicao, async (request, response) => {
    try{
        const user = request.token
        if(user.tipo != "tecnico" && user.tipo != "admin"){ return response.status(400).json({error: "seu token não tem acesso á '/addThing'"})}

        const {titulo, descricao, setor, prioridade} = request.body
        const data = new Date()
        const dataOFC = data.toLocaleString()

        const resultado = await pool.query(`INSERT INTO chamados(titulo, descricao, setor, prioridade, status, responsavel, data_abertura) VALUES($1, $2, $3, $4, 'aberto', null, $5) RETURNING *`, [titulo, descricao, setor, prioridade, dataOFC])
        return response.status(200).json(resultado.rows[0])
    }
    catch(err){
        return response.status(400).json({addThing: err})
    }
})

app.patch('/chamados/:id/assumir', verificarAutenticacao, async (request, response) => {
    try{
        const user = request.token
        const {id} = request.params
        const checkId = await pool.query('SELECT * FROM chamados WHERE id = $1', [id])

        if(user.tipo != "tecnico" && user.tipo != "admin"){ return response.status(400).json({error: "seu token não tem acesso á '/chamados/:id/assumir'"})}

        if(checkId.rows.length == 0){ return response.status(400).json({error: "id não encontrado"}) }

        if(checkId.rows[0].responsavel == null){
            const assumirRole = await pool.query("UPDATE chamados SET responsavel = $1, status = 'em_atendimento' WHERE id = $2 RETURNING *", [user.nome, id])
            return response.status(200).json(assumirRole.rows[0])
        }

        return response.status(200).json({"deu ruim": "não foi possivel assumir"})
    }
    catch(err){
        return response.status(400).json({'ERROR - /chamados/:id/assumir': err})
    }
})

app.patch('/chamados/:id/finalizar', verificarAutenticacao, async (request, response) => {
    try{
        const user = request.token
        const {id} = request.params
        const checkId = await pool.query('SELECT * FROM chamados WHERE id = $1', [id])

        if(user.tipo != "tecnico" && user.tipo != "admin"){ return response.status(400).json({error: "seu token não tem acesso á '/chamados/:id/finalizar'"})}

        if(checkId.rows.length == 0){ return response.status(400).json({error: "id não encontrado"}) }
            if(checkId.rows[0].responsavel == 'em_atendimento'){
            const assumirRole = await pool.query("UPDATE chamados SET status = 'em_atendimento' WHERE id = $1 RETURNING *", [id])
            return response.status(200).json(assumirRole.rows[0])
        }

        return response.status(200).json({"deu ruim": "não foi possivel finalizar"})
    }
    catch(err){
        return response.status(400).json({'ERROR - /chamados/:id/finalizar': err})
    }
})

app.delete('/chamados/:id', somenteAdmin, async (request,response) => {
    try{
        const {id} = request.params
        const tentativa = await pool.query('DELETE FROM chamados WHERE id = $1 RETURNING *', [id])
        return response.status(200).json(tentativa.rows[0])
    }
    catch(err){
        return response.status(400).json({'ERROR - /chamados/:id': err})
    }
})

app.listen(3000)