import superagent from 'superagent';
import cookie from 'superagent-cookie';
import * as dotenv from 'dotenv';
dotenv.config();

let stories = [];
let used_links = [];

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

res = await superagent
  .get('https://newsblur.com/reader/unread_story_hashes')
  .set('User-Agent', "Benfeed")
  .set('include_timestamps', 'true')
  .set('cookie', cookie.use('newsblurCookie'));

let unread_story_hashes = res.body.unread_feed_story_hashes;

if (Object.keys(unread_story_hashes).length > 0) {
  let hashes = [];
  Object.values(unread_story_hashes).slice(0,50).forEach(list => {
    list.forEach(hash => hashes.push(hash));
  });
  res = await superagent
    .get('https://newsblur.com/reader/river_stories?h=' + hashes.join('&h='))
    .set('User-Agent', "Benfeed")
    .set('cookie', cookie.use('newsblurCookie'));

  res.body.stories.forEach(story => {
    let feed = feeds[story.story_feed_id];
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
        timestamp: story.story_timestamp,
        feed: {
          title: feed.feed_title,
          link: feed.feed_link
        }
      });
    }
  });
}

let page = 1;
while (stories.length < 50) {
  res = await superagent
    .get('https://newsblur.com/reader/read_stories?page=' + page)
    .set('User-Agent', "Benfeed")
    .set('read_filter', 'all')
    .set('page', page)
    .set('include_hidden', true)
    .set('cookie', cookie.use('newsblurCookie'));
  res.body.stories.forEach(story => {
    let feed = feeds[story.story_feed_id];
    if (stories.length >= 50) return;
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
        timestamp: story.story_timestamp,
        feed: {
          title: feed.feed_title,
          link: feed.feed_link
        }
      });
    }
  });
  if (stories.length >= 50) break;
  page++;
}

stories.sort((a, b) => (a.timestamp < b.timestamp) ? 1 : -1)
new Date().toLocaleTimeString()
let last_generated = new Date().toLocaleDateString('en-us', { weekday:"long", year:"numeric", month:"short", day:"numeric"});
last_generated += ' ' + new Date().toLocaleTimeString('en-US');
let storylinks = '';

stories.forEach(story => {
  storylinks += `
<h3>
  <a href="${story.permalink}">${story.title}</a>
</h3>
<p>
  <a href="${story.feed.link}">${story.feed.title}</a>
</p>
`;
})

let html = `
<!doctype html>
<html>
  <head>
    <title>
      Ben Werdmuller: Sources
    </title>
    <style>
      body {
        background: #fff;
        width: 99%;
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
      <em>As of ${last_generated}</em>
    </p>
    ${storylinks}
    <footer>
      <a href="https://werd.io">By Ben Werdmuller</a>
    </footer>
  </body>
</html>
`;

console.log(html);