import {influencerStories} from "./influencer-stories";

/** Stable public Instagram post codes; no person/session data is recorded. */
export const storyAnalyticsEntries=influencerStories.flatMap(story=>{
 const code=/\/p\/([A-Za-z0-9_-]+)\/?/.exec(story.postUrl)?.[1];
 return code?[{path:"/story/"+code,name:story.name,image:story.image,postUrl:story.postUrl}]:[];
});
export const storyAnalyticsPaths=new Set(storyAnalyticsEntries.map(story=>story.path));
export const storyAnalyticsPath=(postUrl:string)=>storyAnalyticsEntries.find(story=>story.postUrl===postUrl)?.path||null;
