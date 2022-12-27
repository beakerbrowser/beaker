# Beaker Browser is now archived

**Dec 27, 2022**

Hi friends! This won't come as a huge shock, but the time has finally come that I archive the Beaker Browser repo. In 2022 I moved on to working at [Bluesky](https://blueskyweb.xyz), and, while the Beaker project is coming to an official end, the heart of Beaker continues with Bluesky. I hope the work we do will make Beaker's end a little less painful in the long run.

I'm going to share a post-mortem in this doc, but first I want to thank everybody for the years of incredible support, kindness, and generosity. It was truly overwhelming, and at times I felt it was much more than I deserved. This includes all of the OpenCollective and Patreon donors and the handful of angel investors who put their faith in this project. Again, I hope the future work with Bluesky helps repay your faith and support.

In particular, I want to thank:

- Peter Wang, for the many years of advice and support
- Matthias Buus, Andrew Osheroff, and Tara Vancil for their collaborative spirit and inspired work
- Everyone in the Beaker and Dat/Hypercore ecosystem for being such a great community
- The Internet Archive for helping organize the decentralized Web community into something greater than its constituent parts (shout out to Wendy Hanamura, love yall)
- Michael Mullins, who donated so much to the project, and who has been an incredibly supportive friend
- Each of the angel investors for giving this risky project a shot
- The Electron team for putting up with my strange feature requests
- My family for not having me put away

I almost hesitate to try to enumerate these special callouts because you all deserve to be named. Needless to say, I'm in your debt and am always available if you want to reach out.

## The story

The backstory to Beaker starts with [Secure Scuttlebutt (SSB)](https://scuttlebutt.nz). I had been working on applications for SSB for about two years (2014-2016) and really getting my feet wet with decentralized tech. A number of exciting "bittorrent-variant" protocols were coming about at that time, including IPFS and Dat (eventually renamed Hypercore), and we were all working on how to make these protocols really shine.

The broad mission was to decentralize the Web. With SSB, we had made a social-networking protocol that was local first (meaning it ran mostly on-device) and was therefore extremely hackable. We wanted it to be very easy for people to build upon it.

The problem as I saw it was that app-distribution was too hard. Most of the SSB clients at the time were built on Electron or were local-hosted web servers. I wanted apps to be as easy to load as websites.

This is how the idea for Beaker started. If apps could be distributed with one of these bittorrent-variants, I figured, and then run within a safe sandbox, then we'd be able to create a flourishing ecosystem of apps on shared decentralized network. That was the big premise.

Electron was beginning to mature, and I figured it would help accelerate the development of a niche browser like Beaker, and it did. I was able to produce a demo of Beaker hosting websites via dat/hypercore within 2 weeks. This got a positive response from folks (because it _is_ pretty cool) and so I continued from there. I built in tools for building the websites in-browser. "One click to make a website" was the premise, and it worked great. It gave great demos at talks, and pretty soon I was able to convince Tara to cofound a company with me around the project.

People gave very positive feedback to the demo, but since this isn't a success story you can probably guess what happened next: actual usage stalled. We would produce updates that improved the polish and usability of the browser, and there'd be a small bump, but no stickiness. I indulged in fun features like a web-based commandline in the browser which was certainly cool but did nothing to make the browser useful to people. Many of these features lived in a perpetually half-finished state, and we could never quite solve the stickiness problem.

This feature churn ultimately landed Beaker [an entry in Liron Shapira's "Bloated MVP" blog](https://medium.com/bloated-mvp/beaker-browser-mvp-review-0-use-cases-4-years-of-engineering-0-users-9cc3c0ef24f), and give that a read because I think Liron is pretty spot-on with his analysis. It was a classic product dilemma; we were failing to give users something they wanted, and the flailing was just adding bloat instead of solving the real problem: that Beaker didn't solve a problem for people.

To our credit, we weren't completely blind to the issues. We had a gordian knot of problems that each fed into each other:

- The dat/hyper sites weren't accessible in most browsers
- There was no mobile browser, meaning the most popular computing mode wasn't even available to people
- There was no way to safely sync state between multiple devices, a core issue to the protocol at the time
- The APIs weren't useful enough to build great apps

The first three items were intractable given the resources we had, so I decided to focus on the fourth: API tooling. I figured if we could give a compelling dev experience on desktop, we could create a foothold niche that could help us gain the resources needed to tackle the other problems. In the four years of active development on Beaker, the last 2 were spent focused on those APIs.

On the APIs, I quite simply failed. The pure P2P model gives you a set of really great wins - no backend/frontend separation, local data, offline-first, easily-forked apps, and so on - but then hits you with a cavalcade of challenges. Without some logically centralized repository of data or router of messages, you struggle with discovery and delivery. Users don't stay consistently online and connections will randomly fail, so you stuggle with availability and performance. Initial connections and thus time-to-first-paints are slow, which is very bad news for web browsing. Debugging is quite hard. Managing resource usage on the device is hard. Scaling a user's view of the network past (say) 100k users is pretty much out the window because you're not sharing indexes; rather, you're having each device build the indexes locally. I'm probably forgetting some things, but you get the idea.

Another huge challenge is producing Web APIs that users are _comfortable_ with. People are extremely protective of the Web platform. When you start injecting these novel APIs, there's a sense that the APIs have to really be right because we might soon be stuck with them. That's a tough target to hit, and we suffered some design churn because of it. I was maybe too hesitant to commit heresies.

We went through at least two very significant API designs that never got released. Both of them were modeled as a local "crawling indexer" which would gather views of data published in hyper sites (via json and md) and then could be queried by apps. They were a neat idea; it was like putting a structured-data search engine in the browser. However I was never satisfied with the results because they couldn't patch over the core problems I listed above, and I tanked the releases. Eventually that tanked my collaborative's morale too, and by 2021 Beaker was pretty dead.

I always knew were were trying to steer the Web as outsiders, but what I didn't expect was how fundamentally hard it is to tweak how the Web works. We would try things like making dat/hyper sites double as social profiles, but then needed some way to display that profile UI when you visited the site. We tried all kinds of things -- toolbars, sidepanels that popped up, little buttons in the location bar -- and never really found something that people would notice but which didn't intrude on the browsing experience. The Web is really a light client for applications at this point, and while I won't say it's impossible to add "thick client" behaviors, I can certainly say I never liked the results of my work on it.

After I ran out of ideas for making Beaker work, I decided to give a p2p + servers hybrid a shot with a project called CTZN, another stab at a social network. The smartest thing I did there was [live stream every day of development](https://ctzn.network/dev-vlog), which helped build another wonderful community and keep me sane during the pandemic. That live-stream ultimately caught the attention of Jay Graber as she was forming the Bluesky team, and at the start of 2022 I began working with Bluesky. It was a life changing turn of events and quickly became -- and continues to be -- my dream job.

Beaker is now becoming another archived repo, but I'm incredibly fortunate to carry the heart of its mission with this new team. It was a wonderful and sometimes painful five years, but it gave me the skills I needed to contribute to Bluesky, and I wouldn't trade those five years for anything. Mistakes were made, and thank goodness they were.

## Lessons learned

The entrepreneurs reading this may recognize a common failure pattern here: we got to a really great demo fast, and then hit a cliff that we couldn't surmount. Rather than taking the L and re-evaluating, I slammed my head into the cliff hoping I could break through via force of will, but the tech just wasn't there, and the product wasn't either.

In hindsight, Beaker's MVP was a tool for making static websites. That's it. That's what the product did. If Beaker was going to succeed, that MVP needed to be sticky for people.

Knowing that, the right next move might've been to get dat/hypercore adopted in more browsers and available on mobile -- if p2p static sites were a strong value prop. However, by 2016, that was a pretty dubious value prop to people, and that's ignoring the bad time-to-first-paint and variable uptime. Ironically, the only demographic that Beaker actually helped was teachers on a LAN with students learning how to make websites. It was a shockingly ideal tool for them. Unfortunately that's a small market and wasn't the mission I wanted to pursue.

The way I eventually digested what happened with Beaker was with the "Percent Easy" framework, a somewhat silly premise that I'll try to explain. See, I first started putzing with decentralization around 2012 or 2013, and I made a couple projects that completely bounced for people. They were weird and useless and nobody wanted them. When I had the good sense to follow Dominic Tarr's lead on SSB, things got a little easier for me. More people took interest and a great community formed, but it was still a very hard project to pitch to non-technical people. Then, when the Beaker project started it felt smoother than ever before. The demo was good! The feedback was good! I thought Beaker must be a winner for sure with all the positive feedback it received, so when things started to get hard, I was disoriented.

Eventually I started taking a wider view of what success really means: the magical product-market-fit. Getting PMF is darn hard, so what I ask when I start working on a project is, what % feels easy? Do I get to MVP quickly? Do people love the MVP? Do users stick? Do they start ripping updates out of my hands? Do they ignore the warts? And then do they continue to stick for months or even years? Each of these milestones is a chunk of percentage points that tally up to 100%. If I've got a good project then most of that 100% is going to feel "easy." The higher the percentage that feels easy, the better the odds that the project will succeed. 

The trick, you see, is that every % that isn't "easy" is not just difficult: it's _hard_. Bashing-your-head-through-the-cliff hard. The way I see it, you can maybe get 20% of the way there through sheer effort. That means a project needs to feel 80-90% easy to actually succeed, and frankly I'd caution against anything that's not "90% easy." It's not laziness. It's just acceptance that each % that isn't "easy" is very hard. You're not special and you're not superhuman. Creating successful software is hard.

When I look at Beaker, I think it was probably 50% easy. The initial demo took 2 weeks: 20%. It was a full website editor in about 2 months: 30%. The feedback was great: 50%. The users didn't stick: 50%. We got invited to talks which increased exposure: 51%. A few niche communities took an interest: 53%. Folks liked it enough to donate via OpenCollective and Patreon: 54%. You get the idea. Notably absent is "usage and retention went through the roof: 80%" and then "usage continued to grow for years: 100%."

I'm speaking as a builder that hasn't hit PMF so take all this with the grain of salt, but I find this framework useful to evaluate projects because it forces me to recognize the scope of the work. Early successes can make me imagine future successes are likely. Optimism, determination, and mission can make it easy for me to ignore costs. I now know that I need the wind at my back to climb a mountain, so as I work I keep asking myself, what % easy is this? If the projection starts slipping below 80, then I know I have a problem. If a product sprint to fix `$X` won't get us to 80, then I know I have a problem.

As decentralizers we may be pursuing a mission, but our work only wins in the market, and to win in the market we need to think like entrepreneurs. Ultimately, my lesson learned is that mission needs PMF.

## Other thoughts

A smattering of additional lessons I learned over the years.

Don't be too proud to follow people with inspiration. Every time things went better for me, it's because I followed someone who was already doing something great.

Simplify aggressively. With Bluesky we've opted for using p2p structures (IPLD) on a federated network, giving us some of the key advantages of p2p like account portability while retaining the performance and reliability advantages of servers. The pure p2p tech out there still has a lot of potential, but I think it's a bad fit for large scale social networks and sticking with it for Bluesky would've been a  mistake. I'm glad we approached AT Proto from first principles, and I'm very confident in the protocol at this stage, but if I have any concern it's that we may have kept complexity that ultimately doesn't prove its value. Time will tell.

Never go negative with competiting projects. The decentralized Web community has been pretty great about staying "coopetive" (collaborative + competitive) meaning that we each play to win but we share ideas openly and speak well of each others' work. Stay focused on the shared mission if there is one. This is generally good advice, but it became specifically relevant to me: As I ended up more in the dat/hyper ecosystem, IPFS was often raised as a competing technology and I was frequently asked to comment on the differences. I never went negative, and thank goodness I didn't because one of my colleagues at Bluesky is a core contributor on IPFS, and we've become exceedingly good friends. Besides, going negative is a bad look.

Build a network of talented friends. I've never succeeded by going it alone, and my biggest mistakes have been when I failed to do this. I'm extremely lucky to have the ones I have.

This one came to me from a potential investor, and it was the best unprompted lesson I ever got: don't engage in transactional behavior. When you meet someone for the first time, build an actual relationship. If you don't have a good deal for them, then don't make a pitch. Get to know them. Develop trust. Even if you ultimately do have an ask, it'll work better if they _like_ you -- and if they're not interested, accept the "no" and preserve the relationship. You can guess what I did that led the investor to explain this to me.

Pay more attention to the market than I did. I had reasons for focusing on the Web and desktop, and none of them were the right call.

Don't get too precious about the Web. It's a wonderful open platform, but it's settled into its purpose. Look for opportunities to create new open platforms that fit the moment.

Also, don't bloat your MVP.

## Farewell, Beaker

Beaker has left me with a lot of big memories. Speaking at JS Conf EU was a big one, and the relieved exhaustion that followed the talk. The many DWeb Summits and Camps that gave me a chance to meet TBL and Ted Nelson (!). The fun of giving talks at meetups and fielding questions. Getting to see Germany and Denmark on work trips. The many afternoons of jogging that often felt like a metaphor for my life.

I've had the rare fortune of pursuing a creative mission, and it's because of everyone's support that I could. I can't thank you all enough. I'm disappointed I couldn't ultimately deliver this project to you, but I'm thankful for the friendships and the memories that came along the way.

See you all on the next one.

- Paul