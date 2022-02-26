const express=require('express');
const db = require('better-sqlite3')('./greenhouse.db',{readonly:true}); //opening in readonly to prevent sql injections

/*OpenAPI documentation*/
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./spec.json');

const abbr=require('./abbr.json');

const app= express(); 

app.use('/api-doc', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

const START_YEAR=1990;
const END_YEAR=2014;

app.get('/',(req,res)=>{
  res.redirect('/api-doc');
});

app.get('/countries',(req,res)=>{
  const countries = db.prepare('SELECT * from country').all();
  const result=[];
  for (const country of countries){
    let query = `SELECT DISTINCT year FROM data WHERE country_id=${country.id}`;
    let years = db.prepare(query).all().map(year=>year.year);
    result.push({...country,years});
  }
  res.status(200).send(result);
});

app.get('/country/:id',(req,res)=>{
  const {id}=req.params;

  const country = db.prepare(`SELECT * from country WHERE id=${id}`).all();
  if(country.length){
    let {startYear,endYear,category}=req.query;

    /*adding quotes to each item in the array for building sql query*/
    let categories=Array.isArray(category)?category.map(item => `'${item}'`).join(','):`'${category}'`;

    let sqlQuery=`SELECT * FROM data`;

    /*Column filters*/
    if(category){
      sqlQuery+=` WHERE country_id=${id} AND category IN (${categories})`;
    }
    else{
      sqlQuery+=` WHERE country_id=${id}`;
    }

    /*Row filters*/
    if(startYear || endYear){
      startYear=startYear?startYear:START_YEAR;
      endYear=endYear?endYear:END_YEAR;
       
      if(startYear<=endYear){
        sqlQuery+=` AND year BETWEEN ${startYear} AND ${endYear}`;
      }else{
        res.status(400).send({status:400,message:'Invalid year values'});
        return;
      }
    } 

    /*get values from db and create output json*/
    let values={};
    db.prepare(sqlQuery).all().forEach(row=>{
      let {year,value,category}=row;
      if(year in values){
        values[year][category]=value;
      }else{
        values[year]={};
        values[year][category]=value;
      }
    });
    
    res.status(200).send({...country[0],values});
  }
  else{
    res.status(404).send({status:404,message:'Country not found'});
  }
});

app.get('/abbr',(req,res)=>{
  res.status(200).send(abbr);
});

app.set('port', (process.env.PORT || 3000))
const server = app.listen(app.get('port'), () => {})