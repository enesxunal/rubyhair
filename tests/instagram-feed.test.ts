import test from "node:test";
import assert from "node:assert/strict";
import {normalizeRubyInstagramPosts} from "../src/lib/instagram-feed";

test("Instagram server feed keeps only validated authentic post links and preview media",()=>{
 const input=[
  {id:"1",media_type:"IMAGE",media_url:"https://scontent.cdninstagram.com/test.jpg",permalink:"https://www.instagram.com/p/real_one/",timestamp:"2026-11-14T08:00:00+0000"},
  {id:"2",media_type:"VIDEO",media_url:"https://scontent.cdninstagram.com/video.mp4",thumbnail_url:"https://scontent-dus1-1.cdninstagram.com/preview.jpg",permalink:"https://www.instagram.com/reel/real_two/",timestamp:"2026-11-13T10:00:00+0000"},
  {id:"3",media_type:"IMAGE",media_url:"https://bad.example.com/secret.jpg",permalink:"https://www.instagram.com/p/real_three/"},
  {id:"4",media_type:"IMAGE",media_url:"https://scontent.cdninstagram.com/valid.jpg",permalink:"https://evil.example.com/p/invalid/"},
  {id:"5",media_type:"CAROUSEL_ALBUM",media_url:"https://scontent-dus1-1.fbcdn.net/carousel.jpg",permalink:"https://www.instagram.com/p/real_five/"},
  {id:"6",media_type:"IMAGE",media_url:"http://scontent.cdninstagram.com/no.jpg",permalink:"https://www.instagram.com/p/no_ssl/"},
 ];
 const result=normalizeRubyInstagramPosts(input);
 assert.equal(result.length,3);
 assert.equal(result[0].id,"1");
 assert.equal(result[1].isVideo,true);
 assert.match(result[1].previewUrl,/preview\.jpg$/);
 assert.equal(result[2].id,"5");
});

test("Instagram normalization is empty rather than faking unknown media",()=>{
 assert.deepEqual(normalizeRubyInstagramPosts(null),[]);
 assert.deepEqual(normalizeRubyInstagramPosts({data:[]}),[]);
 assert.deepEqual(normalizeRubyInstagramPosts([
  {id:"bad",media_type:"VIDEO",permalink:"https://www.instagram.com/reel/abc/",media_url:"https://cdninstagram.com/movie.mp4"}
 ]),[]);
});

test("Instagram home implementation explicitly separates live authenticated posts and owned editorial imagery",async()=>{
 const {readFileSync}=await import("node:fs");
 const frontend=readFileSync("src/components/instagram-home.tsx","utf8");
 const auth=readFileSync("src/lib/instagram-feed.ts","utf8");
 assert.ok(frontend.includes("connected?posts.map"));
 assert.ok(frontend.includes("inspiration.map"));
 assert.ok(frontend.includes("setShowExternalMedia(true)"));
 assert.ok(frontend.includes("https://www.instagram.com/rubyhair.de/"));
 assert.ok(auth.includes("RUBY_INSTAGRAM_ACCESS_TOKEN"));
 assert.ok(auth.includes('Authorization:"Bearer "+token'));
 assert.ok(!frontend.includes("RUBY_INSTAGRAM_ACCESS_TOKEN"));
});
