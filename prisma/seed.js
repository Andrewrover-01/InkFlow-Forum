const { PrismaClient, UserRole } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  const categories = await Promise.all([
    prisma.category.upsert({
      where: { slug: "wuxia" },
      update: {},
      create: {
        name: "武侠江湖",
        slug: "wuxia",
        description: "侠义恩仇，快意恩仇",
        icon: "⚔️",
        sortOrder: 1,
      },
    }),
    prisma.category.upsert({
      where: { slug: "xianxia" },
      update: {},
      create: {
        name: "仙侠修真",
        slug: "xianxia",
        description: "飞升成仙，问道长生",
        icon: "🌙",
        sortOrder: 2,
      },
    }),
    prisma.category.upsert({
      where: { slug: "history" },
      update: {},
      create: {
        name: "历史风云",
        slug: "history",
        description: "朝代更迭，风云变幻",
        icon: "📜",
        sortOrder: 3,
      },
    }),
    prisma.category.upsert({
      where: { slug: "romance" },
      update: {},
      create: {
        name: "言情才女",
        slug: "romance",
        description: "红粉佳人，才情并茂",
        icon: "🌸",
        sortOrder: 4,
      },
    }),
    prisma.category.upsert({
      where: { slug: "discussion" },
      update: {},
      create: {
        name: "茶馆闲谈",
        slug: "discussion",
        description: "品茗论道，畅所欲言",
        icon: "🍵",
        sortOrder: 5,
      },
    }),
  ]);

  console.log(`✅ Created ${categories.length} categories`);

  const adminPassword = await bcrypt.hash("admin123456", 12);
  const admin = await prisma.user.upsert({
    where: { email: "admin@inkflow.forum" },
    update: {},
    create: {
      name: "论坛管理",
      email: "admin@inkflow.forum",
      password: adminPassword,
      role: UserRole.ADMIN,
      bio: "墨香论坛管理员",
    },
  });

  console.log(`✅ Created admin user: ${admin.email}`);

  const memberPassword = await bcrypt.hash("member123456", 12);
  const member = await prisma.user.upsert({
    where: { email: "demo@inkflow.forum" },
    update: {},
    create: {
      name: "墨客试读",
      email: "demo@inkflow.forum",
      password: memberPassword,
      role: UserRole.MEMBER,
      bio: "一介书生，爱好文学",
    },
  });

  console.log(`✅ Created demo member: ${member.email}`);

  const post1 = await prisma.post.upsert({
    where: { id: "sample-post-1" },
    update: {},
    create: {
      id: "sample-post-1",
      title: "【武侠】天龙八部读后感：金庸笔下最悲情的英雄",
      content: `《天龙八部》是金庸武侠小说的巅峰之作，书中人物众多，但最令我动容的莫过于萧峰。

萧峰一生，生于契丹，长于汉人。两个民族都是他的根，却也都是他的枷锁。当他发现自己的身世之谜，当他亲手"误杀"阿朱，那一刻的绝望，跨越书页，直抵人心。

"此生此世，再不杀人。"

然而命运弄人，他终究还是走向了那个结局。雁门关前，那一跳，既是对汉人的交代，也是对契丹的交代，更是对自己良心的交代。

金庸说，《天龙八部》写的是"无人不冤，有情皆孽"。萧峰，是这八个字最深刻的诠释。

各位书友有何见解？欢迎共探讨。`,
      summary: "论金庸笔下最悲情英雄萧峰的人生与抉择",
      isPinned: true,
      authorId: admin.id,
      categoryId: categories[0].id,
      tags: {
        create: [
          {
            tag: {
              connectOrCreate: {
                where: { name: "金庸" },
                create: { name: "金庸" },
              },
            },
          },
          {
            tag: {
              connectOrCreate: {
                where: { name: "天龙八部" },
                create: { name: "天龙八部" },
              },
            },
          },
        ],
      },
    },
  });

  const post2 = await prisma.post.upsert({
    where: { id: "sample-post-2" },
    update: {},
    create: {
      id: "sample-post-2",
      title: "【仙侠】修仙小说必看榜单，附简短点评",
      content: `整理了一份个人觉得值得细读的仙侠修真小说，与各位分享：

1. **《凡人修仙传》** - 经典之作，以小人物视角诠释修仙路的艰辛与坚持。韩立的成长令人动容。

2. **《遮天》** - 叶凡的逆天之路，文字燃烧，热血沸腾。世界观宏大，值得一读。

3. **《我欲封天》** - 耳根的作品，情感细腻，主角成长线清晰，结局令人唏嘘。

4. **《一念永恒》** - 同为耳根之作，更加轻松愉快，但不失深度。

5. **《择天记》** - 猫腻的文笔，世界观独特，主角陈长生的命运引人入胜。

请问各位还有哪些好书推荐？`,
      summary: "精选仙侠修真小说榜单，附个人点评",
      authorId: member.id,
      categoryId: categories[1].id,
      tags: {
        create: [
          {
            tag: {
              connectOrCreate: {
                where: { name: "书单推荐" },
                create: { name: "书单推荐" },
              },
            },
          },
          {
            tag: {
              connectOrCreate: {
                where: { name: "仙侠" },
                create: { name: "仙侠" },
              },
            },
          },
        ],
      },
    },
  });

  await prisma.reply.createMany({
    data: [
      {
        content:
          "萧峰确实是金庸群侠中最悲剧的人物，他的悲剧来自于无法调和的身份认同危机。汉人身份、契丹血统，两者的撕裂让他无所归依。",
        floor: 1,
        postId: post1.id,
        authorId: member.id,
      },
      {
        content:
          "同意楼上！金庸说萧峰是他最钟爱的主角，因为写到萧峰之死，他自己也落泪了。这种作者与角色的共情，在文学史上极为罕见。",
        floor: 2,
        postId: post1.id,
        authorId: admin.id,
      },
    ],
    skipDuplicates: true,
  });

  await prisma.reply.createMany({
    data: [
      {
        content:
          "《凡人修仙传》确实是神作！韩立从一个普通农家子弟，一步步走向大能，这种踏实的成长感是很多爽文无法媲美的。",
        floor: 1,
        postId: post2.id,
        authorId: admin.id,
      },
    ],
    skipDuplicates: true,
  });

  console.log("✅ Created sample posts and replies");

  const hotNovels = [
    { rank: 1, title: "斗破苍穹", author: "天蚕土豆", category: "玄幻", hotScore: 9850, sourceUrl: "https://www.qidian.com" },
    { rank: 2, title: "完美世界", author: "辰东", category: "玄幻", hotScore: 9720, sourceUrl: "https://www.qidian.com" },
    { rank: 3, title: "遮天", author: "辰东", category: "仙侠", hotScore: 9680, sourceUrl: "https://www.qidian.com" },
    { rank: 4, title: "凡人修仙传", author: "忘语", category: "仙侠", hotScore: 9540, sourceUrl: "https://www.qidian.com" },
    { rank: 5, title: "庆余年", author: "猫腻", category: "历史", hotScore: 9480, sourceUrl: "https://www.qidian.com" },
    { rank: 6, title: "雪中悍刀行", author: "烽火戏诸侯", category: "武侠", hotScore: 9350, sourceUrl: "https://www.qidian.com" },
    { rank: 7, title: "大主宰", author: "天蚕土豆", category: "玄幻", hotScore: 9200, sourceUrl: "https://www.qidian.com" },
    { rank: 8, title: "择天记", author: "猫腻", category: "仙侠", hotScore: 9100, sourceUrl: "https://www.qidian.com" },
    { rank: 9, title: "武动乾坤", author: "天蚕土豆", category: "玄幻", hotScore: 8980, sourceUrl: "https://www.qidian.com" },
    { rank: 10, title: "将夜", author: "猫腻", category: "仙侠", hotScore: 8860, sourceUrl: "https://www.qidian.com" },
  ];

  for (const novel of hotNovels) {
    await prisma.hotNovel.upsert({
      where: { rank: novel.rank },
      update: { ...novel },
      create: { ...novel },
    });
  }

  console.log(`✅ Seeded ${hotNovels.length} hot novels`);
  console.log("🎉 Seeding completed!");
}

main()
  .catch((error) => {
    console.error("Error during database seeding:", error);
  })
  .finally(() => prisma.$disconnect());
