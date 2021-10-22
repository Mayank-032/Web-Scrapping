// node index.js --url=https://www.espncricinfo.com/series/ipl-2019-1165643/match-results --dest=Teams

let minimist = require('minimist');
let axios = require('axios');
let excel = require('excel4node');
let pdf = require('pdf-lib');
let fs = require('fs');
let path = require('path');
let jsdom = require('jsdom');

let args = minimist(process.argv);                          
let promiseDownload = axios(args.url);
promiseDownload.then(function (response) {
    let AllTeams = path.join(__dirname, args.dest);
    if(!fs.existsSync(AllTeams)) {
        fs.mkdirSync(AllTeams);
    }
    
    let html = response.data;
    extractScorecard(html);
}).catch(function(err){
    console.error(err);
});

function extractScorecard(html) {
    
    let dom = new jsdom.JSDOM(html);
    let document = dom.window.document;

    let AllMatches = document.querySelectorAll("div.match-score-block");

    for (let i = 0; i < AllMatches.length; i++){
        // if(i == 1) break;
        let teamName = AllMatches[i].querySelectorAll("p.name");
        let teamsScorecard = AllMatches[i].querySelectorAll("div.match-cta-container a");
        let link = teamsScorecard[2].getAttribute("href");
        let fullLink = "https://www.espncricinfo.com/" + link;



        let MatchName = AllMatches[i].querySelector("div.match-score-block .match-info .description");
        let temp = MatchName.textContent;
        let heading = "";
            for(let i = 0; i < temp.length; i++) {
                if(temp[i] == '('){
                break;
            }

            heading += temp[i];
        }
        heading = heading.substr(0, heading.length-1);
        


        extractScorecardHTML(fullLink, teamName[0].textContent, teamName[1].textContent, heading);
    }
}

function extractScorecardHTML(url, team1, team2, heading){
    let promise = axios(url);
    promise.then(function(response){
        let html = response.data;
        extractPlayerDetail(html, team1, team2, heading);
    }).catch(function(err){
        console.log(err);
    });
}

function extractPlayerDetail(html, team1, team2, heading) {
    let dom = new jsdom.JSDOM(html);
    let document = dom.window.document;

    let scorecard = document.querySelectorAll("div.match-scorecard-page .Collapsible");
    let playerDetail = [];

    for(let i = 0; i < scorecard.length; i++){
        let batters = scorecard[i].querySelectorAll(".table.batsman tbody tr");
        let batsman = [];
        for(let j = 0; j < batters.length-1; j += 2){
            let player = {};

            let playerStats = batters[j].querySelectorAll("td");
            player.name = playerStats[0].textContent;
            player.run = playerStats[2].textContent;
            player.balls = playerStats[3].textContent;
            player.fours = playerStats[5].textContent;
            player.sixes = playerStats[6].textContent;
            player.sr = playerStats[7].textContent;

            batsman.push(player);
        }

        let bowlers = scorecard[i].querySelectorAll(".table.bowler tbody tr");
        let bowler = [];
        for(let j = 0; j < bowlers.length; j++){
            let playerStats1 = bowlers[j].querySelector(".text-nowrap");
            if(playerStats1 != null){
                let player = {};
                let playerStats = bowlers[j].querySelectorAll("td");

                player.name = playerStats1.textContent;
                player.over = playerStats[1].textContent;
                player.maiden = playerStats[2].textContent;
                player.runs = playerStats[3].textContent;
                player.wickets = playerStats[4].textContent;
                player.economy = playerStats[5].textContent;

                bowler.push(player);
            }
        }

        playerDetail.push(batsman);
        // console.log(batsman);
        playerDetail.push(bowler);
        // console.log(bowler);
    }

    
    let team1Path = path.join(__dirname, args.dest + "/" + team1);
    if(!fs.existsSync(team1Path)) fs.mkdirSync(team1Path);
    let matchName1 = path.join(team1Path, "/"+heading);
    if(!fs.existsSync(matchName1)) fs.mkdirSync(matchName1);

    let matchesJSON1 = JSON.stringify(playerDetail[0]);
    let jsonName1 = matchName1+"/Batting.json";
    fs.writeFileSync(jsonName1, matchesJSON1, "utf-8");
    let teams1JSON = fs.readFileSync(jsonName1, "utf-8");
    let teams1Info = JSON.parse(teams1JSON);
    CreateExcelFileBatting(teams1Info, jsonName1+".xlsx");

    let matchesJSON2 = JSON.stringify(playerDetail[3]);
    let jsonName2 = matchName1+"/Bowling.json";
    fs.writeFileSync(jsonName2, matchesJSON2, "utf-8");
    let teams2JSON = fs.readFileSync(jsonName2, "utf-8");
    let teams2Info = JSON.parse(teams2JSON);
    CreateExcelFileBowling(teams2Info, jsonName2+".xlsx");




    let team2Path = path.join(__dirname, args.dest + "/" + team2);
    if(!fs.existsSync(team2Path)) fs.mkdirSync(team2Path);
    let matchName2 = path.join(team2Path, "/"+heading);
    if(!fs.existsSync(matchName2)) fs.mkdirSync(matchName2);

    let matchesJSON3 = JSON.stringify(playerDetail[2]);
    let jsonName3 = matchName2+"/Batting.json";
    fs.writeFileSync(jsonName3, matchesJSON3, "utf-8");
    let teams3JSON = fs.readFileSync(jsonName3, "utf-8");
    let teams3Info = JSON.parse(teams3JSON);
    CreateExcelFileBatting(teams3Info, jsonName3+".xlsx");

    let matchesJSON4 = JSON.stringify(playerDetail[1]);
    let jsonName4 = matchName2+"/Bowling.json";
    fs.writeFileSync(jsonName4, matchesJSON4, "utf-8");
    let teams4JSON = fs.readFileSync(jsonName4, "utf-8");
    let teams4Info = JSON.parse(teams4JSON);
    CreateExcelFileBowling(teams4Info, jsonName4+".xlsx");
    
    extractMatchSummary(html, team1, team2, matchName1);
    extractMatchSummary(html, team1, team2, matchName2);

    console.log("Done");
}

function CreateExcelFileBatting(teamInfo, teamName) {
    let wb = new excel.Workbook();
    let sheet = wb.addWorksheet("Sheet");

    sheet.cell(1, 1).string("Name");
    sheet.cell(1, 2).string("Runs");
    sheet.cell(1, 3).string("Balls");
    sheet.cell(1, 4).string("Fours");
    sheet.cell(1, 5).string("Sixes");
    sheet.cell(1, 6).string("Strike-Rate");

    for(let i=0; i<teamInfo.length; i++) {
        let name = teamInfo[i].name;
        let runs = teamInfo[i].run;
        let balls = teamInfo[i].balls;
        let fours = teamInfo[i].fours;
        let sixes = teamInfo[i].sixes;
        let sr = teamInfo[i].sr;
            
            
        sheet.cell(2+i, 1).string(name);
        sheet.cell(2+i, 2).string(runs);
        sheet.cell(2+i, 3).string(balls);
        sheet.cell(2+i, 4).string(fours);
        sheet.cell(2+i, 5).string(sixes);
        sheet.cell(2+i, 6).string(sr);            
        
    }
    wb.write(teamName);
}

function CreateExcelFileBowling(teamInfo, teamName) {
    let wb = new excel.Workbook();
    let sheet = wb.addWorksheet("Sheet");

    sheet.cell(1, 1).string("Name");
    sheet.cell(1, 2).string("Over");
    sheet.cell(1, 3).string("Maiden");
    sheet.cell(1, 4).string("Runs");
    sheet.cell(1, 5).string("Wickets");
    sheet.cell(1, 6).string("Economy");

    for(let i=0; i<teamInfo.length; i++) {
        let name = teamInfo[i].name;
        let over = teamInfo[i].over;
        let maiden = teamInfo[i].maiden;
        let runs = teamInfo[i].runs;
        let wickets = teamInfo[i].wickets;
        let economy = teamInfo[i].economy;
            
            
        sheet.cell(2+i, 1).string(name);
        sheet.cell(2+i, 2).string(over);
        sheet.cell(2+i, 3).string(maiden);
        sheet.cell(2+i, 4).string(runs);
        sheet.cell(2+i, 5).string(wickets);
        sheet.cell(2+i, 6).string(economy);            
        
    }
    wb.write(teamName);
}

function extractMatchSummary(html, team1, team2, location){
    let dom = new jsdom.JSDOM(html);
    let document = dom.window.document;

    let teamScores = document.querySelectorAll("div.match-info.match-info-MATCH .score");
    let result = document.querySelector("div.match-info.match-info-MATCH .status-text");
    
    let matchSummary = {};
    let t1score = teamScores[0].textContent;
    let t2score = teamScores[1].textContent; 
    let res = result.textContent;
    
    matchSummary.t1 = team1;
    matchSummary.t2 = team2;
    matchSummary.t1s = t1score;
    matchSummary.t2s = t2score;
    matchSummary.res = res;

    let matchSummaryJSON = JSON.stringify(matchSummary);
    let jsonName = location + "/MatchSummary";
    fs.writeFileSync(jsonName+".json", matchSummaryJSON, "utf-8");
    CreateMatchSummaryPDF(jsonName, matchSummaryJSON);
}

function CreateMatchSummaryPDF(MatchFolderName, MatchSummaryData) {
    let MatchJSON = fs.readFileSync(MatchFolderName+".json", "utf-8");
    let MatchINFO = JSON.parse(MatchJSON);
    
    let matchFileName = path.join(MatchFolderName+".pdf", "");
    let MatchSummaryBytes = fs.readFileSync("MatchSummary.pdf");
    let pdfDocPromise = pdf.PDFDocument.load(MatchSummaryBytes);
    pdfDocPromise.then(function(pdfDoc){
        let page = pdfDoc.getPage(0);
        page.drawText(MatchINFO.t1, {
            x: 320, 
            y: 700, 
            size: 8
        });

        page.drawText(MatchINFO.t2, {
            x: 320, 
            y: 676, 
            size: 8
        });

        page.drawText(MatchINFO.t1s, {
            x: 320, 
            y: 655, 
            size: 8
        });

        page.drawText(MatchINFO.t2s, {
            x: 320, 
            y: 635, 
            size: 8
        });

        page.drawText(MatchINFO.res, {
            x: 320, 
            y: 615, 
            size: 8
        });

        let changedBytesPromise = pdfDoc.save();
        changedBytesPromise.then(function(changedBytes){
            fs.writeFileSync(matchFileName, changedBytes);
        })
    })
}