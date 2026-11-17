/**
 * Original public Instagram post media (not screenshots or highlight covers).
 * Downloaded 2026-11-14 from public @rubyhair.de profile posts and individual media endpoints.
 * Unnamed models are labeled by their hairstyles, not assigned invented personal names.
 * Individual names only when verified in the post/collaboration itself.
 * Client editorial selection: Elaine Victoria first; named contributors only.
 * Hair Boutique and unnamed customer/hairstyle posts are omitted from community cards.
 * Each named creator appears once in the carousel.
 */
export type InfluencerStory={name:string;username:string;image:string;storyImage:string;avatar:string;instagramUrl:string;postUrl:string};
export const influencerStories:InfluencerStory[]=[
  {name:"Elaine Victoria",username:"elaine.victoria",image:"/assets/instagram-posts/ruby-post-04.webp",storyImage:"/assets/instagram-posts/ruby-post-04-story.webp",avatar:"/assets/instagram-avatars/elaine-victoria.webp",instagramUrl:"https://www.instagram.com/elaine.victoria/",postUrl:"https://www.instagram.com/p/DdWuECGjPhu/"},
  {name:"Jessica Haller",username:"jessica_haller",image:"/assets/instagram-posts/ruby-post-03.webp",storyImage:"/assets/instagram-posts/ruby-post-03-story.webp",avatar:"/assets/instagram-avatars/jessica-haller.webp",instagramUrl:"https://www.instagram.com/jessica_haller/",postUrl:"https://www.instagram.com/p/DeRBodOSBLJ/"},
  {name:"Kristina",username:"kristinathrills",image:"/assets/instagram-posts/ruby-post-05.webp",storyImage:"/assets/instagram-posts/ruby-post-05-story.webp",avatar:"/assets/instagram-avatars/kristina.webp",instagramUrl:"https://www.instagram.com/kristinathrills/",postUrl:"https://www.instagram.com/p/DcyyKV5uAXp/"},
  {name:"Asena Neuhoff",username:"asenaneuhoff",image:"/assets/instagram-posts/ruby-post-06.webp",storyImage:"/assets/instagram-posts/ruby-post-06-story.webp",avatar:"/assets/instagram-avatars/asena-neuhoff.webp",instagramUrl:"https://www.instagram.com/asenaneuhoff/",postUrl:"https://www.instagram.com/p/Dcl4tzkM9jA/"}
];
