import {
  PrismaClient,
  RecordVisibility,
  TaskDifficulty,
  TaskStatus,
  UserRole,
} from '@prisma/client';

const prisma = new PrismaClient();

const categories = [
  {
    slug: 'nature-world',
    name: '自然与世界',
    description: '亲近自然、感受天气与季节变化。',
    sortOrder: 60,
  },
  {
    slug: 'city-strangeness',
    name: '城市与陌生感',
    description: '在熟悉城市中发现新鲜路径与角落。',
    sortOrder: 50,
  },
  {
    slug: 'create-learn',
    name: '创造与学习',
    description: '动手制作、学习一项小技能。',
    sortOrder: 40,
  },
  {
    slug: 'people-relations',
    name: '人与关系',
    description: '与他人建立真实而轻量的连接。',
    sortOrder: 30,
  },
  {
    slug: 'culture-feelings',
    name: '文化与感受',
    description: '阅读、观影、展览与情绪记录。',
    sortOrder: 20,
  },
  {
    slug: 'courage-try',
    name: '勇气与新尝试',
    description: '安全范围内的第一次尝试。',
    sortOrder: 10,
  },
] as const;

async function main() {
  await prisma.schemaMeta.upsert({
    where: { key: 'phase' },
    update: { value: '6' },
    create: { key: 'phase', value: '6' },
  });

  const admin = await prisma.user.upsert({
    where: { wxOpenId: 'seed-admin-openid' },
    update: {
      displayName: 'Seed Admin',
      role: UserRole.ADMIN,
    },
    create: {
      wxOpenId: 'seed-admin-openid',
      displayName: 'Seed Admin',
      role: UserRole.ADMIN,
    },
  });

  const seedUser = await prisma.user.upsert({
    where: { wxOpenId: 'seed-user-openid' },
    update: {
      displayName: 'Seed User',
      role: UserRole.USER,
    },
    create: {
      wxOpenId: 'seed-user-openid',
      displayName: 'Seed User',
      role: UserRole.USER,
    },
  });
  void admin;

  const categoryIds: Record<string, string> = {};
  for (const category of categories) {
    const saved = await prisma.category.upsert({
      where: { slug: category.slug },
      update: {
        name: category.name,
        description: category.description,
        sortOrder: category.sortOrder,
        isActive: true,
      },
      create: {
        ...category,
        isActive: true,
      },
    });
    categoryIds[category.slug] = saved.id;
  }

  const demoTasks = [
    {
      key: 'sunrise-walk',
      categorySlug: 'nature-world',
      title: '看一次日出或清晨散步',
      summary: '在清晨出门，感受一天开始时的光线与空气。',
      instructions:
        '选择一个安全、方便到达的地点。提前一晚准备好出门时间。到达后停留至少 15 分钟，留意光线、温度和声音。若天气不佳，可改为清晨开窗观察天色变化。',
      difficulty: TaskDifficulty.EASY,
      estimatedMinutes: 40,
      tags: ['morning', 'nature', 'low-cost'],
      status: TaskStatus.PUBLISHED,
      sortOrder: 100,
      alternatives: '阴雨天可改为清晨开窗观察天空，或在室内阳台完成。',
      reflectionPrompt: '今天早晨最让你安静下来的瞬间是什么？',
      budgetNote: '无需消费',
    },
    {
      key: 'new-street',
      categorySlug: 'city-strangeness',
      title: '走一条从未走过的街',
      summary: '在熟悉城市里换一条陌生路线，重新观察日常。',
      instructions:
        '打开地图，挑一条你平时不会走的街道或小路。步行 20-40 分钟，沿途记录 3 个以前没注意过的细节（店铺、植物、声音或建筑）。注意交通安全，避开危险区域。',
      difficulty: TaskDifficulty.EASY,
      estimatedMinutes: 35,
      tags: ['city', 'walk'],
      status: TaskStatus.PUBLISHED,
      sortOrder: 90,
      alternatives: '行动不便时可乘公交坐一两站，在新站点附近观察。',
      reflectionPrompt: '哪个细节最出乎你的意料？',
    },
    {
      key: 'learn-fold',
      categorySlug: 'create-learn',
      title: '学折一只纸鹤或简单手工艺',
      summary: '用一张纸完成一个可带走的小作品。',
      instructions:
        '准备一张纸，按教程完成一只纸鹤或同等简单手工艺。过程中允许失败重来。完成后拍照或保留实物均可。',
      difficulty: TaskDifficulty.MEDIUM,
      estimatedMinutes: 45,
      tags: ['craft', 'learn'],
      status: TaskStatus.PUBLISHED,
      sortOrder: 80,
      alternatives: '没有彩纸可用普通 A4 纸；也可改画一幅 10 分钟速写。',
      reflectionPrompt: '哪一步最需要耐心？',
    },
    {
      key: 'draft-only',
      categorySlug: 'culture-feelings',
      title: '（草稿）写一段未发布的观影笔记',
      summary: '此任务仅用于验证公开接口不会返回草稿。',
      instructions: '看一部片，写 100 字感受。',
      difficulty: TaskDifficulty.EASY,
      estimatedMinutes: 30,
      tags: ['draft-demo'],
      status: TaskStatus.DRAFT,
      sortOrder: 5,
    },
    {
      key: 'archived-only',
      categorySlug: 'courage-try',
      title: '（已下架）旧版挑战任务',
      summary: '此任务仅用于验证公开接口不会返回下架内容。',
      instructions: '历史任务，已下架。',
      difficulty: TaskDifficulty.HARD,
      estimatedMinutes: 60,
      tags: ['archived-demo'],
      status: TaskStatus.ARCHIVED,
      sortOrder: 1,
    },
  ] as const;

  for (const task of demoTasks) {
    const existing = await prisma.task.findFirst({
      where: { title: task.title },
    });
    const data = {
      categoryId: categoryIds[task.categorySlug],
      title: task.title,
      summary: task.summary,
      instructions: task.instructions,
      difficulty: task.difficulty,
      estimatedMinutes: task.estimatedMinutes,
      tags: [...task.tags],
      status: task.status,
      sortOrder: task.sortOrder,
      alternatives: 'alternatives' in task ? task.alternatives : undefined,
      reflectionPrompt:
        'reflectionPrompt' in task ? task.reflectionPrompt : undefined,
      budgetNote: 'budgetNote' in task ? task.budgetNote : undefined,
    };

    if (existing) {
      await prisma.task.update({ where: { id: existing.id }, data });
    } else {
      await prisma.task.create({ data });
    }
  }

  const sunrise = await prisma.task.findFirst({
    where: { title: '看一次日出或清晨散步' },
  });
  if (sunrise) {
    await prisma.userTask.upsert({
      where: {
        userId_taskId: { userId: seedUser.id, taskId: sunrise.id },
      },
      create: {
        userId: seedUser.id,
        taskId: sunrise.id,
        startedAt: new Date(),
        completedAt: new Date(),
      },
      update: {
        startedAt: new Date(),
        completedAt: new Date(),
      },
    });

    const publicTitle = '种子公开回忆：清晨散步';
    const existingPublic = await prisma.explorationRecord.findFirst({
      where: { userId: seedUser.id, titleSnapshot: publicTitle },
    });
    if (existingPublic) {
      await prisma.explorationRecord.update({
        where: { id: existingPublic.id },
        data: {
          taskId: sunrise.id,
          reflectionText: '空气很凉，但光线让人愿意多站一会儿。',
          visibility: RecordVisibility.PUBLIC,
        },
      });
    } else {
      await prisma.explorationRecord.create({
        data: {
          userId: seedUser.id,
          taskId: sunrise.id,
          titleSnapshot: publicTitle,
          reflectionText: '空气很凉，但光线让人愿意多站一会儿。',
          visibility: RecordVisibility.PUBLIC,
        },
      });
    }

    const privateTitle = '种子私密回忆：仅自己可见';
    const existingPrivate = await prisma.explorationRecord.findFirst({
      where: { userId: seedUser.id, titleSnapshot: privateTitle },
    });
    if (!existingPrivate) {
      await prisma.explorationRecord.create({
        data: {
          userId: seedUser.id,
          taskId: sunrise.id,
          titleSnapshot: privateTitle,
          reflectionText: '这条不应出现在公开列表。',
          visibility: RecordVisibility.PRIVATE,
        },
      });
    }
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error: unknown) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
