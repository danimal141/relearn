# relearn
This system reminds us of our favorite screenshots in Dropbox every day. It picks files up from Dropbox and notifies the shared links to your Slack channel.

## Architecture
![relearn drawio](https://user-images.githubusercontent.com/1821807/160271749-4936d09c-48ff-4faf-bbb3-ca4b1d89bf18.png)

## Motivation
When I find some good tweets or posts etc.. I take a screenshot and upload it to my Dropbox, but I never check it again...

This system reminds us of the screenshots randomly every day, and we can relearn them.

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
