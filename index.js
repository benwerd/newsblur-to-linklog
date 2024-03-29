import superagent from 'superagent';
import cookie from 'superagent-cookie';
import * as dotenv from 'dotenv';
dotenv.config();

let stories = [];
let used_links = [];

const pushStory = (story, feed, feeds) => {
    if (
      feeds[story.story_feed_id] && 
      story.story_permalink.indexOf('newsblur.com') == -1 && 
      story.story_permalink.indexOf('werd.io') == -1 &&
      feed.feed_link.indexOf('werd.io') == -1 &&
      !used_links.includes(story.story_permalink)) {
        used_links.push(story.story_permalink);
        stories.push({
          title: story.story_title,
          permalink: story.story_permalink,
          date: story.story_date,
          timestamp: parseInt(story.story_timestamp),
          feed: {
            title: feed.feed_title,
            link: feed.feed_link
          }
        });
  }
}

let res = await superagent
  .post('https://newsblur.com/api/login')
  .send({username: process.env.NEWSBLUR_USERNAME, password: process.env.NEWSBLUR_PASSWORD})
  .type('form')
  .set('User-Agent', "Benfeed");

cookie.save(res.headers['set-cookie'], 'newsblurCookie');

res = await superagent
  .get('https://newsblur.com/reader/feeds')
  .set('User-Agent', "Benfeed")
  .set('flat', 'true')
  .set('cookie', cookie.use('newsblurCookie'));

let feeds = res.body.feeds;

let page = 1;

while(stories.length < 100 || page < 25) {

  res = await superagent
    .get('https://newsblur.com/reader/river_stories?read_filter=all&page=' + page)
    .set('User-Agent', "Benfeed")
    .set('cookie', cookie.use('newsblurCookie'));

  res.body.stories.forEach(story => {
    let feed = feeds[story.story_feed_id];
    pushStory(story, feed, feeds);
  });
  page++;

}

stories = stories.sort((a, b) => (a.timestamp < b.timestamp) ? 1 : -1).slice(0,100);

let last_generated = new Date().toLocaleDateString('en-us', { weekday:"long", year:"numeric", month:"short", day:"numeric"});
last_generated += ' ' + new Date().toLocaleTimeString('en-US');
let storylinks = '';

stories.forEach(story => {
  let published = new Date(story.timestamp * 1000);
  let dateline = published.toLocaleDateString('en-us', { weekday:"long", year:"numeric", month:"short", day:"numeric"});
  dateline += ' ' + published.toLocaleTimeString('en-US');
  storylinks += `
<h3>
  <a href="${story.permalink}">${story.title}</a>
</h3>
<p>
  <a href="${story.feed.link}">${story.feed.title}</a><a href="${story.permalink}">, ${dateline}</a>
</p>
`;
})

let html = `
<!doctype html>
<html>
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>
      Ben Werdmuller: Sources
    </title>
    <style>
      body {
        background: #fff;
        width: 85%;
        max-width: 760px;
        margin: auto;
        font-family: Merriweather,serif;
      }
      a {
        text-decoration: none;
        color: #000;
        font-weight: 400;
      }
      h1 {
        margin: 0;
        margin-top: 2em;
      }
      h3 {
        font-weight: 400;
        margin-bottom: 0;
        padding-bottom: 0;
      }
      p {
        margin-top: 0.5em;
        border-bottom: 1px #ccc solid;
        padding-bottom: 0.5em;
        font-size: 0.8em;
      }
      p a {
        color: #999;
      }
      p a:hover {
        color: #666;
      }
      .time {
        border: 0;
        margin-bottom: 3em;
      }
      footer {
        margin-top: 3em;
        margin-bottom: 3em;
        font-size: 0.8em;
      }
    </style>
    <link href="https://fonts.googleapis.com/css?family=Merriweather:300,300i,400,400i,700,700i" rel="stylesheet">
  </head>
  <body>
    <h1>Sources</h1>
    <p class="time">
      <em>The latest posts from <a href="https://werd.io" rel="me">my</a> subscriptions, as of ${last_generated}.</em>
    </p>
    ${storylinks}
    <footer>
      <a href="https://werd.io" rel="me">By Ben Werdmuller</a>
    </footer>
  </body>
</html>
`;

console.log(html);
