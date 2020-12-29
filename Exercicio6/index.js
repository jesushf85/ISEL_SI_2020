const express = require('express')
const axios = require('axios')
const es6Renderer = require('express-es6-template-engine')
const crypto = require('crypto')
const queryString = require('querystring')
const cookieParser = require('cookie-parser')

const githubAPIEndpoints = {
    authURL: 'https://github.com/login/oauth/authorize',
    tokenURL: 'https://github.com/login/oauth/access_token',
    apiURL: 'https://api.github.com'
}

const googleAPIEndpoints = {
    authURL: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenURL: 'https://oauth2.googleapis.com/token',
    userinfoURL: 'https://openidconnect.googleapis.com/v1/userinfo',
    calendarEventsURL: 'https://www.googleapis.com/calendar/v3/calendars/primary/events'
}

const webClientGit = {
    client_id: '6b90c02b89fbb7be8298',
    client_secret: 'e14184c27b447e156d82a357d85a76fdad38ea03',
}

const webClientGoogle = {
    client_id: '221028070554-233ctan2uprdcc859qovp788r4eahmql.apps.googleusercontent.com',
    client_secret: 'FJBsgsMK8jhRG8MEqJUsRTzj',
    apiKey: 'AIzaSyCmfb5UTimncpm-2yLt-Io-p2YNpxsMvvg',
    scopes: {
        calendar: 'https://www.googleapis.com/auth/calendar',
        events: 'https://www.googleapis.com/auth/calendar.events'
    }
}

const app = express()
const port = 3000
const appLoginDB = []

app.use('/public', express.static('public'));
app.use(cookieParser())
app.use(express.urlencoded());

app.engine('html', es6Renderer)

app.set('views', 'views')
app.set('view engine', 'html')

app.get('/', (req, res) => {
    if (req.cookies && login(req.cookies.loginEmail, req.cookies.loginToken)) {
        es6Renderer(`${__dirname}/views/welcome.html`, { locals: { user: req.cookies.loginEmail } }, (err, content) => err || content)
            .then(output => res.send(output))
    }
    else {
        res.sendFile(`${__dirname}/views/index.html`)
    }
})

app.get('/login', (req, res) => {
    const nonce = crypto.randomBytes(16).toString('base64')

    res.redirect(`${googleAPIEndpoints.authURL}`
        + `?client_id=${webClientGoogle.client_id}`
        + `&response_type=code`
        + `&scope=openid%20email%20${webClientGoogle.scopes.calendar}%20${webClientGoogle.scopes.events}`
        + `&redirect_uri=http%3A//localhost%3A3000/login-callback`
        + `&nonce=${nonce}`)
})

app.get('/login-callback', async (req, res) => {

    const query = req.query

    if (query.code) {

        const opts = { headers: { content_type: 'application/x-www-form-urlencoded' } };

        const requestBody = {
            code: query.code,
            client_id: webClientGoogle.client_id,
            client_secret: webClientGoogle.client_secret,
            redirect_uri: 'http://localhost:3000/login-callback',
            grant_type: 'authorization_code'
        }

        await axios.post(`${googleAPIEndpoints.tokenURL}`, requestBody, opts)
            .then(tokenResponse => tokenResponse)
            .then(async tokenResponse => {

                if (tokenResponse.data) {

                    await axios.get(`${googleAPIEndpoints.userinfoURL}?access_token=${tokenResponse.data.access_token}`)
                        .then(userInfoResponse => userInfoResponse)
                        .then(userInfoResponse => {

                            if (userInfoResponse.data) {
                                appLoginDB.push({
                                    email: userInfoResponse.data.email,
                                    token: tokenResponse.data.access_token
                                })
                                res.cookie('loginEmail', userInfoResponse.data.email, { httpOnly: true })
                                res.cookie('loginToken', tokenResponse.data.access_token, { httpOnly: true })
                                es6Renderer(`${__dirname}/views/welcome.html`, { locals: { user: userInfoResponse.data.email } }, (err, content) => err || content)
                                    .then(output => res.send(output))
                            }
                            else {
                                console.log("Error in data retrieved for USER INFO: " + err)
                            }
                        })
                        .catch(err => console.log("Error when asking for USER INFO: " + err))
                }
                else {
                    console.log("Error in data retrieved for ACCESS TOKEN: " + err)
                }
            })
            .catch(err => console.log("Error when asking for ACCESS TOKEN: " + err))
    }
    else {
        res.send("Unauthorized access!")
    }
})

app.get('/welcome', (req, res) => {
    if (req.cookies && login(req.cookies.loginEmail, req.cookies.loginToken)) {
        es6Renderer(`${__dirname}/views/welcome.html`, { locals: { user: req.cookies.loginEmail } }, (err, content) => err || content)
            .then(output => res.send(output))
    }
    else {
        res.send('Unauthorized access!')
    }
})

app.get('/authorize-github', (req, res) => {
    res.redirect(githubAPIEndpoints.authURL + `?client_id=${webClientGit.client_id}&scope=repo`)
})

app.get('/authorize-github-callback', async (req, res) => {
    if (req.cookies && login(req.cookies.loginEmail, req.cookies.loginToken)) {
        let repoData = []

        const body = {
            ...webClientGit,
            code: req.query.code
        };

        const opts = { headers: { accept: 'application/json' } };

        await axios.post(githubAPIEndpoints.tokenURL, body, opts).
            then(resdata => resdata.data['access_token']).
            then(async _token => {
                repoData = await askForRepoInfo(_token);
            }).
            catch(err => res.status(500).json({ message: err.message }));

        es6Renderer(`${__dirname}/views/milestones.html`, { locals: { repoData: repoData } }, (err, content) => err || content)
            .then(output => res.send(output))
    }
    else {
        res.send('Unauthorized access!')
    }
})

app.post('/addEventToCalendar', async (req, res) => {

    if (req.cookies && login(req.cookies.loginEmail, req.cookies.loginToken)) {

        const opts = {
            headers: {
                accept: 'application/json',
                authorization: `Bearer ${req.cookies.loginToken}`,
                content_type: 'application/json'
            }
        }

        try {
            const createDate = req.body.create_date.split('T')[0]
            const endDate = req.body.close_date === 'N/A' ?
                (req.body.due_date === 'N/A' ? createDate : req.body.due_date.split('T')[0]) :
                req.body.close_date.split('T')[0]

            if (new Date(createDate) > new Date(endDate)) {
                return res.status(400).json({ message: 'Creation date must be earlier than End date!' })
            }

            const requestBody = {
                summary: req.body.title,
                description: req.body.description,
                start: {
                    date: createDate
                },
                end: {
                    date: endDate
                }
            }

            await axios.post(`${googleAPIEndpoints.calendarEventsURL}?key=${webClientGoogle.apiKey}`, requestBody, opts)
                .then(response => response)
                .then(response => {
                    console.log(response)
                })
                .catch(err => res.sendStatus(500).json({ message: err }))
        }
        catch (exception) {
            return res.status(400).json({ message: 'Invalid date' })
        }
    }
    return res.status(200)
})

async function askForRepoInfo(token) {
    const repos = []

    const opts =
    {
        headers: {
            accept: 'application/vnd.github.v3+json',
            authorization: `token ${token}`
        }
    }

    await axios.get(`${githubAPIEndpoints.apiURL}/user/repos`, opts)
        .then(response => response)
        .then(async responseRepos => {

            if (responseRepos && responseRepos.data) {
                const promiseArr = []
                responseRepos.data.forEach(repo => promiseArr.push(new Promise(async resolve => {

                    await axios.get(`${githubAPIEndpoints.apiURL}/repos/${repo.full_name}/milestones`, opts)
                        .then(response => response)
                        .then(responseMilestones => {
                            const milestones = []

                            if (responseMilestones && responseMilestones.data) {
                                responseMilestones.data.forEach(milestone => {
                                    milestones.push({
                                        id: milestone.id,
                                        title: milestone.title || 'N/A',
                                        description: milestone.description || 'N/A',
                                        create_date: milestone.created_at || 'N/A',
                                        update_date: milestone.updated_at || 'N/A',
                                        due_date: milestone.due_on || 'N/A',
                                        close_date: milestone.closed_at || 'N/A'
                                    })
                                })
                            }

                            repos.push({
                                id: repo.id,
                                name: repo.full_name,
                                isPrivate: repo.private,
                                milestones: milestones
                            })
                        })
                    resolve(repos)
                })))
                await Promise.all(promiseArr)
            }
        })
        .catch(err => {
            console.error(err)
        })
    return repos
}

function login(email, token) {
    if (!email || email === undefined || !token || token === undefined) {
        return false
    }
    else {
        return appLoginDB.find(entry => {
            return email === entry.email && token === entry.token
        })
    }
}

app.listen(port, () => {
    console.log(`NodeJS Server listening at http://localhost:${port}`)
})