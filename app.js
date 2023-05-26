// imports
import { createRequire } from "module";
import path from 'path';
import { fileURLToPath } from 'url';
import { api, initSamDB } from 'samaritan-js-sdk';

// imports
const require = createRequire(import.meta.url);
const bodyParser = require('body-parser');
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const express = require('express');
const app = express();
const port = 3000;

// connect to the database
const wsEndpoint = 'ws://127.0.0.1:8888';
initSamDB(wsEndpoint);

// app config
const config = {
    did: "did:sam:apps:DSqfQjcjWaEwnaBxfF3UmpbPnw04p2Ww4F8v6k3WqUFsx",
    keys: "able grow grass shove purpose drip hybrid rough still royal real crime"
};

// DID: 

// Keys: 
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

// static files
app.use(express.static('public'));
app.use('/css', express.static(__dirname + 'public/css'));
app.use('/js', express.static(__dirname + 'public/js'));
app.use('/img', express.static(__dirname + 'public/img'));

// set views
app.set('views', './views');
app.set('view engine', 'ejs');

app.get(["/", "/index"], (_, res) => {
    displayHomePage(res)
});

app.get(["/register"], (_, res) => {
    res.render('register');
});

app.get(["/login"], (_, res) => {
    res.render('login');
});

app.post('/signup', (req, res) => {
    signUpUser(req.body, res);
});

app.post('/signin', (req, res) => {
    signInUser(req.body, res);
});

app.post('/update-profile', (req, res) => {
    updateProfile(req.body, res);
});

app.get('/logout', (_, res) => {
    // destroy the session
    destroySession(res);
});

app.get('/profile', async (req, res) => {
    let did = req.query.did;
    let is_user = false;
    if (!did) { // get did session user
        await api.db.get(config, { app_did: config.did, sam_did: "", keys: ["session_user"] }, async function (data) {
            if (!data.output.length)
                res.render('login', { data: [] });
            else {
                is_user = true;
                did = data.output;
            }
        }, function (_) {
            res.render('/', { data: [] });
        });
    }

    // now select data belonging to DID
    await api.db.get(config, { app_did: config.did, sam_did: did, keys: ["profile"] }, async function (data) {
        const new_data = data.output[0] ? JSON.parse(data.output[0]) : {};
        res.render('profile', { data: new_data, is_user });
    }, function (_) {
        res.render('profile', { data: {}, is_user });
    });
});

// update the profile of the DID
async function updateProfile(req, res) {
    // select session user
    await api.db.get(config, { app_did: config.did, sam_did: "", keys: ["session_user"] }, async function (data) {
        let session_did = data.output[0];
        if (session_did) {
            // save the modified data
            await api.db.insert(config, { app_did: config.did, sam_did: session_did, keys: ["profile"], values: [JSON.stringify(req.profile)] }, async function (response) {
                res.status(200).send({ error: false, data: `Congratulations. Your profile has been updated.` });
            }, function (_) {
                res.status(403).send({ error: true, data: "Could not update profile" });
            });
        } else
            res.status(500).send({ error: true, data: "Could not update profile" });
    });
}

// remove the session user and return to login page
async function destroySession(res) {
    // process deletion
    await api.db.del(config, { app_did: config.did, sam_did: "", keys: ["session_user"] }, async function (data) {
        res.render('login');
    }, function (_) {
        res.render('login');
    });
}

// render homepage selecting all the members of the dating site
async function displayHomePage(res) {
    // first check if a session user is present, if not, move to authentication
    await api.db.get(config, { app_did: config.did, sam_did: "", keys: ["session_user"] }, async function (data) {
        if (!data.output.length)
            return res.render('login', { data: [] });

        await api.db.get(config, { app_did: config.did, sam_did: "", keys: ["auth"] }, async function (data) {
            const new_data = data.output[0] ? JSON.parse(data.output[0]) : {};
            res.render('members', { data: new_data });
        }, function (_) {
            res.render('login', { data: [] });
        });
    }, function (_) {
        res.render('login', { data: [] });
    });
}

// signup user
async function signUpUser(req, res) {
    // first check that the DID exists on the network (without password importance)
    await api.did.auth(config, { sam_did: req.values[0], password: "null" }, async function (_) {
        await api.db.get(config, { app_did: config.did, sam_did: "", keys: ["auth"] }, async function (data) {
            const new_data = data.output[0] ? JSON.parse(data.output[0]) : {};
            // make sure the did has not been registered
            const did = req.values[0];
            if (new_data[did]) {
                res.status(403).send({ error: true, data: "DID exists already" });
            } else {
                new_data[did] = req.values.slice(1);    // save data
                // save the modified data
                await api.db.insert(config, { app_did: config.did, sam_did: "", keys: ["auth"], values: [JSON.stringify(new_data)] }, async function (response) {
                    await setSessionUser(did);
                    res.status(200).send({ error: false, data: "Sign up successful" });
                }, function (_) {
                    res.status(403).send({ error: true, data: "Could not sign you up" });
                });
            }
        }, function (_) {
            res.status(404).send({ error: true, data: "Could not sign you up" });
        });
    }, function (response) {
        res.status(404).send({ error: true, data: response.msg, auth: true });
    });
}

async function signInUser(req, res) {
    // first check that the DID exists on the network (without password importance)
    await api.did.auth(config, { sam_did: req.values[0], password: "null" }, async function (_) {
        await api.db.get(config, { app_did: config.did, sam_did: "", keys: ["auth"] }, async function (data) {
            // check for the password
            let userData = data.output[0] ? JSON.parse(data.output[0]) : {};
            const did = req.values[0];
            if (userData[did] && userData[did][2] == req.values[1]) {
                // set session user
                await setSessionUser(did);
                res.status(200).send({ error: false, data: "Sign in successful!" });
            } else
                res.status(404).send({ error: true, data: "No user matched details provided" });
        }, function (_) {
            res.status(404).send({ error: true, data: "Could not sign you in" });
        });
    }, function (response) {
        res.status(404).send({ error: true, data: response.msg, auth: true });
    });
}

// set session user
async function setSessionUser(did) {
    await api.db.insert(config, { app_did: config.did, sam_did: "", keys: ["session_user"], values: [did] });
}

// listen on port 3000
app.listen(port, () => console.info(`listening on port ${port}`));