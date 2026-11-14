/**
 * Original public Instagram post media (not screenshots or highlight covers).
 * Downloaded 2026-11-14 from the actual Instagram /media/?size=l endpoints.
 * Individual names only when verified in the post/collaboration itself.
 */
export type InfluencerStory={name:string;username:string;image:string;storyImage:string;avatar:string;instagramUrl:string;postUrl:string};
export const influencerStories:InfluencerStory[]=[
  {name:"Hair Boutique",username:"hairboutiique",image:"/assets/instagram-posts/ruby-post-01.webp",storyImage:"/assets/instagram-posts/ruby-post-01-story.webp",avatar:"/assets/instagram-avatars/hair-boutique.webp",instagramUrl:"https://www.instagram.com/hairboutiique/",postUrl:"https://www.instagram.com/p/DfVB0WouqXC/"},
  {name:"Hair Boutique",username:"hairboutiique",image:"/assets/instagram-posts/ruby-post-02.webp",storyImage:"/assets/instagram-posts/ruby-post-02-story.webp",avatar:"/assets/instagram-avatars/hair-boutique.webp",instagramUrl:"https://www.instagram.com/hairboutiique/",postUrl:"https://www.instagram.com/p/DfFi9wXOQSg/"},
  {name:"Jessica Haller",username:"jessica_haller",image:"/assets/instagram-posts/ruby-post-03.webp",storyImage:"/assets/instagram-posts/ruby-post-03-story.webp",avatar:"/assets/instagram-avatars/jessica-haller.webp",instagramUrl:"https://www.instagram.com/jessica_haller/",postUrl:"https://www.instagram.com/p/DeRBodOSBLJ/"},
  {name:"Elaine Victoria",username:"elaine.victoria",image:"/assets/instagram-posts/ruby-post-04.webp",storyImage:"/assets/instagram-posts/ruby-post-04-story.webp",avatar:"/assets/instagram-avatars/elaine-victoria.webp",instagramUrl:"https://www.instagram.com/elaine.victoria/",postUrl:"https://www.instagram.com/p/DdWuECGjPhu/"}
];
