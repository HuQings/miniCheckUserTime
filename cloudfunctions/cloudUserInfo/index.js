const cloud = require("wx-server-sdk");
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});

const db = cloud.database();
const SURVEY_VERSION = 'short-video-v1';
const DEFAULT_SURVEY_CONFIG = {
  surveyVersion: SURVEY_VERSION,
  name: '大学生短视频依赖评估与干预方案',
  period: 21,
  usageFields: [
    { title: '短视频使用_休闲娱乐类', countField: 'leisureCount', hoursField: 'leisureHours' },
    { title: '短视频使用_学习工作类', countField: 'studyCount', hoursField: 'studyHours' },
    { title: '短视频使用_社交类', countField: 'socialCount', hoursField: 'socialHours' }
  ],
  likertOptions: [
    { value: '1', label: 'A.完全不符合' },
    { value: '2', label: 'B.不太符合' },
    { value: '3', label: 'C.不置可否' },
    { value: '4', label: 'D.比较符合' },
    { value: '5', label: 'E.完全符合' }
  ],
  genderOptions: ['男', '女'],
  gradeOptions: ['大一', '大二', '大三', '大四'],
  dependencyQuestions: [
    { field: 'fatigue', text: '长时间刷短视频后，我会觉得空虚疲累。' },
    { field: 'guilt', text: '长时间刷短视频后，我会因逝去的时光而自责自疚。' },
    { field: 'interference', text: '长时间刷短视频，明显地干扰了我的学习和生活。' },
    { field: 'withdrawal', text: '倘若不能碰手机（比如手机没电、被老师统一管理时），我会觉得心里发慌、难受或想发脾气。' },
    { field: 'annoyance', text: '明知长时间刷短视频不好但又放不下，这令我很烦躁。' },
    { field: 'control', text: '我很难控制刷短视频的时长，有种“越刷越不够”的感觉。' }
  ],
  interventionQuestion: {
    field: 'interventionEffective',
    text: '我认为本周实施的短视频使用干预方案对我是有效的。'
  },
  feedbackQuestion: '请为本项目实施提出意见或建议'
};

const ensureSurveyConfig = async () => {
  try {
    const res = await db.collection('surveyConfigs').doc(SURVEY_VERSION).get();
    if (res.data) {
      return res.data;
    }
  } catch (e) {
    try {
      await db.createCollection('surveyConfigs');
    } catch (createError) {}
  }

  const config = {
    ...DEFAULT_SURVEY_CONFIG,
    createTime: db.serverDate(),
    updateTime: db.serverDate()
  };
  await db.collection('surveyConfigs').doc(SURVEY_VERSION).set({
    data: config
  });
  return DEFAULT_SURVEY_CONFIG;
};

const getSurveyConfig = async () => {
  try {
    const config = await ensureSurveyConfig();
    return {
      success: true,
      data: config
    };
  } catch (e) {
    console.error('获取问卷配置失败:', e);
    return {
      success: false,
      errMsg: e,
      data: DEFAULT_SURVEY_CONFIG
    };
  }
};

const updateSurveyConfig = async (event) => {
  try {
    try {
      await db.createCollection('surveyConfigs');
    } catch (createError) {}
    const config = {
      ...DEFAULT_SURVEY_CONFIG,
      ...(event.data || {}),
      surveyVersion: SURVEY_VERSION,
      updateTime: db.serverDate()
    };
    await db.collection('surveyConfigs').doc(SURVEY_VERSION).set({
      data: config
    });
    return {
      success: true,
      data: config
    };
  } catch (e) {
    console.error('更新问卷配置失败:', e);
    return {
      success: false,
      errMsg: e
    };
  }
};
// 获取openid
const getOpenId = async () => {
  // 获取基础信息
  const wxContext = cloud.getWXContext();
  return {
    openid: wxContext.OPENID,
    appid: wxContext.APPID,
    unionid: wxContext.UNIONID,
  };
};

const getUserInfo = async () => {
  return await db.collection('users').get()
}

// 创建集合
const createCollection = async () => {
  try {
    // 创建集合
    await db.createCollection("solutions");
    await db.collection("solutions").add({
      data: {
        openid: "1",
        day: "上海",
      },
    });
    return {
      success: true,
    };
  } catch (e) {
    // 这里catch到的是该collection已经存在，从业务逻辑上来说是运行成功的，所以catch返回success给前端，避免工具在前端抛出异常
    return {
      success: true,
      data: "create collection success",
    };
  }
};

// 查询数据
const selectRecord = async () => {
  // 返回数据库查询结果
  return await db.collection("solutions").get();
};

// 更新数据
const updateRecord = async (event) => {
  try {
    for (let i = 0; i < event.data.length; i++) {
      await db
        .collection("solutions")
        .where({
          _id: event.data[i]._id,
        })
        .update({
          data: {
            sales: event.data[i].sales,
          },
        });
    }
    return {
      success: true,
      data: event.data,
    };
  } catch (e) {
    return {
      success: false,
      errMsg: e,
    };
  }
};

// 新增数据
const insertRecord = async (event) => {
  try {
    const insertRecord = event.data;
    await db.collection("solutions").add({
      data: {
        openid: insertRecord.openid,
        day: insertRecord.city
      },
    });
    return {
      success: true,
      data: event.data,
    };
  } catch (e) {
    return {
      success: false,
      errMsg: e,
    };
  }
};

// 删除数据
const deleteRecord = async (event) => {
  try {
    await db
      .collection("solutions")
      .where({
        _id: event.data._id,
      })
      .remove();
    return {
      success: true,
    };
  } catch (e) {
    return {
      success: false,
      errMsg: e,
    };
  }
};

// 获取打卡进度
const getCheckinProgress = async (event) => {
  const openid = event.openid;
  const period = event.period || 21;
  
  try {
    // 获取该用户的所有记录
    const recordsRes = await db.collection('usageRecords').where({
      openid: openid,
      surveyVersion: SURVEY_VERSION
    }).orderBy('createTime', 'asc').get();
    
    const records = recordsRes.data || [];
    const completedDaySet = records.reduce((set, record) => {
      if (record.day) set[record.day] = true;
      return set;
    }, {});
    const completedDays = Object.keys(completedDaySet).length;
    let currentDay = period;
    for (let day = 1; day <= period; day++) {
      if (!completedDaySet[day]) {
        currentDay = day;
        break;
      }
    }
    
    return {
      success: true,
      data: {
        records: records,
        currentDay: currentDay,
        completedDays: completedDays,
        period: period
      }
    };
  } catch (e) {
    console.error('获取打卡进度失败:', e);
    return {
      success: true,
      data: {
        records: [],
        currentDay: 1,
        completedDays: 0,
        period: period
      }
    };
  }
};

const dependencyFields = ['fatigue', 'guilt', 'interference', 'withdrawal', 'annoyance', 'control'];

const toNumber = (value) => {
  const numberValue = parseFloat(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
};

const getDependencyLevel = (score) => {
  if (score <= 10) return '低依赖组';
  if (score <= 18) return '中度依赖组';
  return '高依赖组';
};

const getDayMeta = (day) => {
  const week = Math.ceil(day / 7);
  const weekDay = ((day - 1) % 7) + 1;
  return {
    week,
    weekDay,
    phase: week === 1 ? '基线期' : '干预期'
  };
};

// 分析短视频调查数据并生成反馈
const analyzeUsage = async (event) => {
  const data = event.data || {};
  const day = event.day || 1;
  const period = event.period || 21;
  const openid = event.openid;
  const userInfo = event.userInfo || {};
  const dayMeta = getDayMeta(day);
  const usageData = {
    leisureCount: toNumber(data.leisureCount),
    leisureHours: toNumber(data.leisureHours),
    studyCount: toNumber(data.studyCount),
    studyHours: toNumber(data.studyHours),
    socialCount: toNumber(data.socialCount),
    socialHours: toNumber(data.socialHours)
  };
  const totalShortVideoCount = usageData.leisureCount + usageData.studyCount + usageData.socialCount;
  const totalShortVideoHours = usageData.leisureHours + usageData.studyHours + usageData.socialHours;
  const scaleData = data.scale || {};
  const dependencyScore = dependencyFields.reduce((sum, field) => sum + toNumber(scaleData[field]), 0);
  const hasScale = dependencyFields.some(field => scaleData[field]);
  const dependencyLevel = hasScale ? getDependencyLevel(dependencyScore) : '';
  const interventionEffective = scaleData.interventionEffective ? toNumber(scaleData.interventionEffective) : 0;
  const timePenalty = Math.max(0, totalShortVideoHours - 3) * (hasScale ? 5 : 8);
  const score = Math.round(Math.max(0, 100 - (hasScale ? dependencyScore * 3 : 0) - timePenalty));
  const adviceList = [];

  if (totalShortVideoHours > 5) {
    adviceList.push({
      icon: '▶',
      type: '短视频总时长',
      level: 'high',
      levelText: '需要关注',
      content: `您今日短视频总使用时长约 ${totalShortVideoHours.toFixed(1)} 小时，已经偏高。`,
      tips: '建议设置单次使用上限，把休闲短视频集中到固定时间段。'
    });
  } else if (totalShortVideoHours > 3) {
    adviceList.push({
      icon: '▶',
      type: '短视频总时长',
      level: 'medium',
      levelText: '适度控制',
      content: `您今日短视频总使用时长约 ${totalShortVideoHours.toFixed(1)} 小时。`,
      tips: '可以尝试先减少休闲娱乐类短视频的打开次数。'
    });
  } else {
    adviceList.push({
      icon: '▶',
      type: '短视频总时长',
      level: 'low',
      levelText: '良好',
      content: `您今日短视频总使用时长约 ${totalShortVideoHours.toFixed(1)} 小时，整体可控。`,
      tips: '继续保持记录，有助于观察三周内的变化。'
    });
  }

  if (usageData.leisureHours > usageData.studyHours + usageData.socialHours) {
    adviceList.push({
      icon: '🎯',
      type: '用途结构',
      level: 'medium',
      levelText: '结构偏休闲',
      content: '今日休闲娱乐类短视频占比最高。',
      tips: '可以把休闲短视频前置为明确奖励，而不是无意识打开。'
    });
  }

  if (hasScale) {
    const levelMap = {
      '低依赖组': { level: 'low', text: '低依赖' },
      '中度依赖组': { level: 'medium', text: '中度依赖' },
      '高依赖组': { level: 'high', text: '高依赖' }
    };
    const levelInfo = levelMap[dependencyLevel];
    adviceList.push({
      icon: '📋',
      type: '依赖评估',
      level: levelInfo.level,
      levelText: levelInfo.text,
      content: `本次量表得分为 ${dependencyScore} 分，评估为${dependencyLevel}。`,
      tips: dependencyLevel === '低依赖组' ? '请继续保持稳定使用习惯。' : '建议继续参与后续两周干预活动，并关注难以停止、烦躁和自责等体验。'
    });
  }

  if (interventionEffective) {
    adviceList.push({
      icon: '💡',
      type: '干预反馈',
      level: interventionEffective >= 4 ? 'low' : interventionEffective === 3 ? 'medium' : 'high',
      levelText: interventionEffective >= 4 ? '有效' : interventionEffective === 3 ? '待观察' : '需调整',
      content: `您对本周干预方案有效性的评分为 ${interventionEffective} 分。`,
      tips: interventionEffective >= 4 ? '当前方案可以继续执行。' : '建议记录具体困难，便于后续优化干预方案。'
    });
  }

  const summary = {
    rating: hasScale ? dependencyLevel : '已记录',
    emoji: hasScale ? '📋' : '✅',
    text: hasScale
      ? `第${dayMeta.week}周第${dayMeta.weekDay}天记录完成。短视频总时长 ${totalShortVideoHours.toFixed(1)} 小时，量表得分 ${dependencyScore} 分。`
      : `第${dayMeta.week}周第${dayMeta.weekDay}天记录完成。短视频总时长 ${totalShortVideoHours.toFixed(1)} 小时，使用频次 ${totalShortVideoCount} 次。`
  };

  try {
    await db.collection('usageRecords').add({
      data: {
        openid: openid,
        surveyVersion: SURVEY_VERSION,
        day: day,
        week: dayMeta.week,
        weekDay: dayMeta.weekDay,
        phase: dayMeta.phase,
        userInfo: userInfo,
        usageData: data,
        shortVideoUsage: usageData,
        totalShortVideoCount: totalShortVideoCount,
        totalShortVideoHours: totalShortVideoHours,
        avgDailyHours: totalShortVideoHours,
        totalUsageHours: totalShortVideoHours,
        scaleData: scaleData,
        dependencyScore: dependencyScore,
        dependencyLevel: dependencyLevel,
        interventionEffective: interventionEffective,
        feedback: data.feedback || '',
        score: score,
        createTime: db.serverDate(),
        updateTime: db.serverDate()
      }
    });
  } catch (e) {
    console.error('保存使用记录失败:', e);
  }

  if (day === period) {
    let allRecords = [];
    try {
      const recordsRes = await db.collection('usageRecords').where({
        openid: openid,
        surveyVersion: SURVEY_VERSION
      }).orderBy('createTime', 'asc').get();
      allRecords = recordsRes.data || [];
    } catch (e) {
      console.error('获取历史记录失败:', e);
    }

    const recordsForSummary = allRecords.length > 0 ? allRecords : [{ score, dependencyScore, totalShortVideoHours }];
    const totalAvgHours = recordsForSummary.reduce((sum, record) => sum + (record.totalShortVideoHours || record.avgDailyHours || 0), 0) / recordsForSummary.length;
    const scaleRecords = recordsForSummary.filter(record => record.dependencyScore);
    const avgDependencyScore = scaleRecords.length > 0
      ? Math.round(scaleRecords.reduce((sum, record) => sum + (record.dependencyScore || 0), 0) / scaleRecords.length)
      : dependencyScore;
    const finalLevel = getDependencyLevel(avgDependencyScore);
    const finalSummary = {
      rating: finalLevel,
      emoji: '🏆',
      text: `恭喜完成为期三周的短视频依赖评估与干预任务！三周平均每日短视频使用 ${totalAvgHours.toFixed(1)} 小时，阶段量表平均 ${avgDependencyScore} 分，综合评估为${finalLevel}。`
    };

    return {
      success: true,
      data: {
        isFinal: true,
        summary: finalSummary,
        adviceList: adviceList,
        score: Math.round(recordsForSummary.reduce((sum, record) => sum + (record.score || 0), 0) / recordsForSummary.length),
        allRecords: allRecords,
        avgDailyHours: totalAvgHours
      }
    };
  }

  return {
    success: true,
    data: {
      isFinal: false,
      day: day,
      summary: summary,
      adviceList: adviceList,
      score: score
    }
  };
};

// 云函数入口函数
exports.main = async (event, context) => {
  switch (event.type) {
    case "getOpenId":
      return await getOpenId();
    case "userInfo":
      return await getUserInfo();
    case "getMiniProgramCode":
      return await getMiniProgramCode();
    case "createCollection":
      return await createCollection();
    case "selectRecord":
      return await selectRecord();
    case "updateRecord":
      return await updateRecord(event);
    case "insertRecord":
      return await insertRecord(event);
    case "deleteRecord":
      return await deleteRecord(event);
    case "getCheckinProgress":
      return await getCheckinProgress(event);
    case "getSurveyConfig":
      return await getSurveyConfig();
    case "updateSurveyConfig":
      return await updateSurveyConfig(event);
    case "analyzeUsage":
      return await analyzeUsage(event);
  }
};
