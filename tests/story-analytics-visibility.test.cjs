const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const page=fs.readFileSync('app/admin/analytics/page.tsx','utf8');
const css=fs.readFileSync('src/styles/admin-v2.css','utf8');
const tracking=fs.readFileSync('src/components/influencer-stories.tsx','utf8');
const backend=fs.readFileSync('src/lib/admin-analytics-report.ts','utf8');
const source=fs.readFileSync('src/data/story-analytics.ts','utf8');

test('Story analytics returns as a permanent visible section of the protected admin dashboard',()=>{
 assert.ok(page.includes('if(!await isAdmin())redirect'));
 assert.ok(page.includes('<section className="rh-adv-story-dashboard" id="story-analytics"'));
 assert.ok(!page.includes('<details className="rh-adv-community">'));
 assert.ok(page.indexOf('className="rh-adv-story-dashboard"')<page.indexOf('className="rh-ops-paid-overview"'));
 assert.match(page,/href="#story-analytics"/);
 assert.match(page,/report\.engagement\.storyViews/);
 assert.match(page,/report\.previousEngagement\.storyViews/);
 assert.match(page,/report\.stories\.map/);
 assert.match(page,/report\.daily\.map/);
 assert.match(page,/Story-Aufrufe im Zeitverlauf/);
 assert.match(page,/Story-Statistiken/);
 assert.match(page,/Statistik-Einwilligung/);
 assert.match(css,/\.rh-adv-story-dashboard/);
 assert.match(css,/@media\(max-width:720px\)\{\.rh-adv-story-dashboard/);
});

test('Story events and rankings still use consent-restricted anonymous events; no made-up views',()=>{
 assert.match(tracking,/trackRubyEvent\("story_view",path\)/);
 assert.match(source,/storyAnalyticsEntries=influencerStories/);
 assert.match(backend,/if\(row\.event==="story_view"\)countInto\(storyCounts,row\.path,count\)/);
 assert.match(backend,/stories:storyAnalyticsEntries\.map\(story=>\(\{\.\.\.story,views:storyCounts\.get\(story\.path\)\|\|0\}\)\)/);
 assert.match(page,/enabledValue\(enabled,story\.views\)/);
 assert.ok(!page.includes('Storys wurden gelöscht'));
});
