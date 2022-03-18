# relearn
This system reminds me of your favorite screenshots in Dropbox every day. It picks files up from Dropbox and notify the shared links to your Slack channel.

## Set up
- Create you Dropbox app from [the developer page](https://www.dropbox.com/developers/documentation).
  - Get your refresh token, client id, client secret.
- Create your Slack app from [the slack api page](https://api.slack.com/apps).
  - Get your webhook url.
- Please fork this repository and set required environment variables in the Actions secrets.
  - See `.env.template`.

## Development
- Develop
  - `yarn dev`
- Watch code changes
  - `yarn dev:watch`
- Lint
  - `yarn lint`
- Format
  - `yarn format`
