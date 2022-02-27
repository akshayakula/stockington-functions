const functions = require("firebase-functions");
const keys = require("./keys.json")
const axios = require('axios');
const { convert } = require('html-to-text');
var cors = require('cors');  
const stocks = require('stock-ticker-symbol');
// Create and Deploy Your First Cloud Functions
// https://firebase.google.com/docs/functions/write-firebase-functions

exports.openai = functions.https.onRequest((req, res) => {
  
    let prompt = `Summarize this report from NASDAQ: COIN for an investor:\n. regulators and governmental authorities, including those related to sanctions, export control, we are, and may continue to be, subject to material litigation`
    const headers = {
        "Authorization": `Bearer ${keys.OpenAI}`
    }
    const body = {
        "prompt": `${prompt}`,
        "max_tokens": 2000
    }
    openai_url = 'https://api.openai.com/v1/engines/text-davinci-001/completions'
    
    axios.post(openai_url,body,{headers})
    .then(response => {
        console.log(response.data.choices[0].text)
        res.send(response.data.choices[0].text)
    })
    .catch(err => res.send(err))
});

exports.sec = functions.https.onRequest((req,res) => {
    // cors(req, res, () => {
        console.log('hi')
        let ticker = JSON.stringify(req.body).split(/(\"[^"]+\")/g)[1].replaceAll("\"", "")

        const openai_url = 'https://api.openai.com/v1/engines/text-davinci-001/completions'
        // let ticker = req.body.ticker;
        let company_name = stocks.lookup(ticker)
        console.log(company_name)
        let getData = (url) => {
            return axios.get(url)
            .then(res => {
            const text = convert(res.data, {});
            // console.log(text);
            var lines = text.split('\n');
            var filtered = "";
            for(var i = 0;i < lines.length;i++){
                if(lines[i].length > 50){
                if(lines[i].split(" ").length > 5){ //generous 50/5 = 10 character average word size check
                    var len = lines[i].length
                    if(lines[i].replace(/[^A-Z]/g, "").length < len / 5){ //max of 1/5th the total line can be capital
                    filtered = filtered + " " + lines[i];
                    }          
                }
                }
            }
        
            //filter out parentheses 
            filtered = filtered.replace(/\(([^)]+)\)/g, "");

            //filter out non-ascii text
            filtered = filtered.replace(/([^\x00-\x7F])/g, "");
        
            //filter out small sentences until desired limit
            var limit = 21000;
            var sentenceSize = 20;
            while(filtered.length > limit){
                var lines = filtered.split(".");
                var newFiltered = "";
                for(var i = 0; i<lines.length; i++){
                if(lines[i].length > sentenceSize){
                    newFiltered = newFiltered + "." + lines[i];
                }
                }
                filtered = newFiltered;
                    
                //filter out new lines
                filtered = filtered.replace("\n", " ");
        
                //filter out white space
                filtered = filtered.replace(/\s+/g, " ");
        
                sentenceSize +=1;
            }
        
            //split into 3 segments
            var output = [];
            var segmentSize = filtered.length/3;
            output.push(filtered.substring(0, segmentSize));
            output.push(filtered.substring(segmentSize, segmentSize*2));
            output.push(filtered.substring(segmentSize*2));
        
            return output; //return array of 3 segments of text that has been filtered to have more meaningful data
            })
            .catch(error => {
            console.error(error)
            })
        }

        sec_url = `https://api.sec-api.io?token=${keys.SEC}`;
        const body = {
            "query": {
                "query_string": {
                        "query": `ticker:(${ticker}) AND formType:\"10-K\"`
                }
            },
            "from": "0",
            "size": "20",
            "sort": [{ "filedAt": { "order": "desc" } }]
        }
        axios.post(sec_url,body)
        .then(response => {
            console.log(response.data.filings[0].linkToFilingDetails)
            getData(response.data.filings[0].linkToFilingDetails)
            .then(result => {
                ////RUN OPEN AI API
                let prompt = `Summarize this report from ${company_name} for an investor:\n`
                const headers = {
                    "Authorization": `Bearer ${keys.OpenAI}`
                }
                const body1 = {
                    "prompt": `${prompt}\n${result[0]}\n\nTl;dr`,
                    "max_tokens": 200
                }
                axios.post(openai_url,body1,{headers})
                .then(response1 => {
                    const body2 = {
                        "prompt": `${prompt}\n${result[1]}\n\nTl;dr`,
                        "max_tokens": 200
                    }
                    axios.post(openai_url,body2,{headers})
                    .then(response2 => {
                        const body3 = {
                            "prompt": `${prompt}\n${result[2]}\n\nTl;dr`,
                            "max_tokens": 200
                        }
                        axios.post(openai_url,body3,{headers})
                        .then(response3 => {
                            console.log("DONE")
                            res.send(`${response1.data.choices[0].text}${response2.data.choices[0].text}${response3.data.choices[0].text}`)
                        })
                        .catch(err =>{
                            res.send(err)
                        }) 
                    })

                })
                .catch(err => {
                    console.log('bug is here')
                    res.send(err)
                })
            })
        })
        .catch(err => {
            console.log(err)
        })
    // })
});

exports.twilio = functions.https.onRequest((req,res) => {
    const twilio_url = `https://api.twilio.com/2010-04-01/Accounts/${keys.twilio_sid}/Messages.json`;
    const params = new URLSearchParams();
    params.append("Body", "test Message");  
    params.append("From", "+19032896780");
    params.append("To", keys.number);

    axios.post(twilio_url, params, { 
        auth: {
            username: keys.twilio_sid,
            password: keys.twilio_token
        }
    })
    .then(() => {
        console.log('works')
    })
    .catch(err => {
        console.log(err)
    })

    res.send("works")
});

exports.addNumber = functions.https.onRequest( (req,res) => {
    let num = req.body.number;
    let ticker = req.body.ticker;
    console.log(num)
    console.log(ticker)
    res.send("works")
});