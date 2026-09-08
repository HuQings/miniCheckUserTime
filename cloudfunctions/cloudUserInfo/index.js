const cloud = require("wx-server-sdk");
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});

const db = cloud.database();
const SURVEY_VERSION = 'short-video-v4';
const INTERVENTION_GROUP = '1';
const DAILY_CHECKIN_LIMIT_ENABLED = true;
const INITIAL_CONSENT_VERSION = 'v2';
const INTERVENTION_VIDEO_FILE_ID_PREFIX = 'cloud://checkusetime-d0goggmcg60d6136e.6368-checkusetime-d0goggmcg60d6136e-1425308418/intervention-videos';
const INTERVENTION_VIDEO_TITLES = [
  '手机灰度模式',
  '发起线下社交',
  '正向收益清单法',
  '每日正念呼吸冥想',
  '呼吸注意力训练',
  '11分钟单点注意力训练',
  '睡前渐进式肌肉放松',
  '睡前PMR肌肉放松',
  '正念静心冥想',
  'CBT认知重构',
  '动机访谈唤出技术',
  '表达性艺术疏导',
  '撰写自我成长微小说',
  '结构化复合运动',
  '多样化一小时运动',
  '一小时组合运动',
  '慢跑+羽毛球一小时运动',
  '慢跑+体育舞蹈运动',
  '慢跑搭配球类运动',
  '一小时慢跑球类运动',
  '复合有氧球类运动'
];
const DEFAULT_SURVEY_CONFIG = {
  surveyVersion: SURVEY_VERSION,
  name: '大学生短视频依赖评估与干预方案',
  projectName: '国家级大创项目实验平台',
  projectNumber: '202514390020',
  period: 24,
  usageFields: [
    { title: '休闲娱乐类', countField: 'leisureCount', hoursField: 'leisureHours' },
    { title: '学习工作类', countField: 'studyCount', hoursField: 'studyHours' },
    { title: '社交类', countField: 'socialCount', hoursField: 'socialHours' }
  ],
  likertOptions: [
    { value: '1', label: 'A.完全不符合' },
    { value: '2', label: 'B.不太符合' },
    { value: '3', label: 'C.不置可否' },
    { value: '4', label: 'D.比较符合' },
    { value: '5', label: 'E.完全符合' }
  ],
  groupOptions: [
    { value: '1', label: '1组' },
    { value: '2', label: '2组' }
  ],
  genderOptions: ['男', '女'],
  gradeOptions: ['大一', '大二', '大三', '大四', '研究生及以上'],
  primaryUsageOptions: ['休闲娱乐类', '学习工作类', '社交类'],
  dependencyQuestions: [
    { field: 'fatigue', text: '长时间的刷短视频后，我会觉得空虚或疲累。' },
    { field: 'guilt', text: '长时间的刷短视频后，我会因逝去的时光而自责或自疚。' },
    { field: 'interference', text: '长时间刷短视频，明显地干扰了我的学习或生活。' },
    { field: 'withdrawal', text: '倘若不能碰手机（比如手机没电、被统一管理时），我会觉得心里发慌、难受或想发脾气。' },
    { field: 'annoyance', text: '明知长时间刷短视频不好但又放不下，这令我很烦躁。' },
    { field: 'control', text: '我很难控制刷短视频的时长，有种“越刷越不够”的感觉。' }
  ],
  readinessOptions: [
    { value: 'precontemplation', label: 'A. 前意向期：我目前没有觉得这是问题，也不打算改变。' },
    { value: 'contemplation', label: 'B. 意向期：我意识到有负面影响，但最近（1个月内）没有行动打算。' },
    { value: 'preparation', label: 'C. 准备期：我打算在接下来一个月内开始减少使用。' },
    { value: 'action', label: 'D. 行动期：我已经开始减少使用，但维持时间不足6个月。' },
    { value: 'maintenance', label: 'E. 维持期：我已经成功减少使用超过6个月。' }
  ],
  consentText: '我同意参加该项目为期24天的实验活动，我承诺会全程参与。',
  interventionConsentText: '我同意参加该项目第二阶段为期三周的干预活动，我承诺会全程参与。',
  controlConsentText: '我同意参加该项目第二阶段为期三周的问卷追踪活动，我承诺会全程参与。',
  interventionQuestion: {
    field: 'interventionEffective',
    text: '我认为本周实施的短视频使用干预方案，总体上是有效的。'
  },
  feedbackQuestion: '请您给我们设计的短视频使用干预方案提出改进的建议：',
  closingThanks: '非常感谢您的全程参与！祝您生活愉快！'
};

const ensureCollection = async (name) => {
  try {
    await db.createCollection(name);
  } catch (e) {}
};

const ensureSurveyConfig = async () => {
  await ensureCollection('surveyConfigs');
  await ensureCollection('usageRecords');
  await ensureCollection('participantConsents');
  await ensureCollection('interventionReflections');

  try {
    const res = await db.collection('surveyConfigs').doc(SURVEY_VERSION).get();
    if (res.data) {
      return res.data;
    }
  } catch (e) {}

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

const saveInterventionReflection = async (event) => {
  const openid = cloud.getWXContext().OPENID;
  const evaluationDay = Number(event.day);
  const taskEvaluation = String(event.taskEvaluation || '').trim();

  if (!Number.isInteger(evaluationDay) || evaluationDay < 5 || evaluationDay > 24) {
    return { success: false, errMsg: '当前日期无需填写昨日干预完成情况' };
  }
  if (!taskEvaluation) {
    return { success: false, errMsg: '请填写线下任务完成情况评价' };
  }
  if (taskEvaluation.length > 1000) {
    return { success: false, errMsg: '评价内容不能超过1000字' };
  }

  await ensureCollection('interventionReflections');
  const previousDay = evaluationDay - 1;
  const previousRecordRes = await db.collection('usageRecords').where({
    openid,
    surveyVersion: SURVEY_VERSION,
    day: previousDay,
    group: INTERVENTION_GROUP,
    videoCompleted: true
  }).limit(1).get();
  const previousRecord = (previousRecordRes.data || [])[0];
  if (!previousRecord || !previousRecord.interventionVideoTitle) {
    return { success: false, errMsg: '未找到上一天已完成的干预视频' };
  }

  const reflectionId = `${openid}_${SURVEY_VERSION}_${evaluationDay}`;
  await db.collection('interventionReflections').doc(reflectionId).set({
    data: {
      openid,
      surveyVersion: SURVEY_VERSION,
      evaluationDay,
      previousDay,
      interventionVideoIndex: previousRecord.interventionVideoIndex,
      interventionVideoTitle: previousRecord.interventionVideoTitle,
      videoCompletedTime: previousRecord.videoCompletedTime || null,
      taskEvaluation,
      createTime: db.serverDate(),
      updateTime: db.serverDate()
    }
  });

  return { success: true };
};

const getInitialConsentStatus = async () => {
  const openid = cloud.getWXContext().OPENID;
  const consentId = `${openid}_${SURVEY_VERSION}_${INITIAL_CONSENT_VERSION}`;
  await ensureCollection('participantConsents');
  await ensureCollection('usageRecords');

  const [consentRes, recordsRes] = await Promise.all([
    db.collection('participantConsents').doc(consentId).get().catch(() => ({ data: null })),
    db.collection('usageRecords').where({
      openid,
      surveyVersion: SURVEY_VERSION
    }).limit(1).get()
  ]);
  const accepted = Boolean(
    (consentRes.data && consentRes.data.accepted) ||
    (recordsRes.data && recordsRes.data.length > 0)
  );

  return {
    success: true,
    data: { accepted }
  };
};

const acceptInitialConsent = async () => {
  const openid = cloud.getWXContext().OPENID;
  const consentId = `${openid}_${SURVEY_VERSION}_${INITIAL_CONSENT_VERSION}`;
  await ensureCollection('participantConsents');
  await db.collection('participantConsents').doc(consentId).set({
    data: {
      openid,
      accepted: true,
      surveyVersion: SURVEY_VERSION,
      consentVersion: INITIAL_CONSENT_VERSION,
      acceptedTime: db.serverDate(),
      updateTime: db.serverDate()
    }
  });
  return {
    success: true,
    data: { accepted: true }
  };
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
    await ensureCollection('surveyConfigs');
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

const getChinaDateKey = value => {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return '';
  return new Date(date.getTime() + 8 * 60 * 60 * 1000).toISOString().slice(0, 10);
};

const getCheckinState = (records, period) => {
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

  const today = getChinaDateKey();
  const hasCheckedInToday = records.some(record => {
    const recordDate = record.checkinDate || getChinaDateKey(record.createTime);
    return recordDate === today;
  });
  const todayCompleted = DAILY_CHECKIN_LIMIT_ENABLED && hasCheckedInToday;
  const experimentCompleted = completedDays >= period;

  return {
    currentDay,
    completedDays,
    today,
    todayCompleted,
    dailyCheckinLimitEnabled: DAILY_CHECKIN_LIMIT_ENABLED,
    experimentCompleted,
    canCheckinToday: !todayCompleted && !experimentCompleted
  };
};

// 获取打卡进度
const getCheckinProgress = async (event) => {
  const openid = cloud.getWXContext().OPENID;
  const period = event.period || 24;
  
  try {
    // 获取该用户的所有记录
    const recordsRes = await db.collection('usageRecords').where({
      openid: openid,
      surveyVersion: SURVEY_VERSION
    }).orderBy('createTime', 'asc').get();
    
    const records = recordsRes.data || [];
    const firstDayRecord = records.find(record => record.day === 1);
    const checkinState = getCheckinState(records, period);
    
    return {
      success: true,
      data: {
        records: records,
        currentDay: checkinState.currentDay,
        completedDays: checkinState.completedDays,
        todayCompleted: checkinState.todayCompleted,
        dailyCheckinLimitEnabled: checkinState.dailyCheckinLimitEnabled,
        canCheckinToday: checkinState.canCheckinToday,
        experimentCompleted: checkinState.experimentCompleted,
        group: firstDayRecord ? firstDayRecord.group : '',
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
        todayCompleted: false,
        dailyCheckinLimitEnabled: DAILY_CHECKIN_LIMIT_ENABLED,
        canCheckinToday: true,
        experimentCompleted: false,
        period: period
      }
    };
  }
};

const getInterventionVideos = async (event) => {
  const openid = cloud.getWXContext().OPENID;
  const day = Number(event.day);
  if (day < 4 || day > 24) {
    return { success: false, errMsg: '当前日期不在干预期内' };
  }

  const recordsRes = await db.collection('usageRecords').where({
    openid,
    surveyVersion: SURVEY_VERSION
  }).orderBy('createTime', 'asc').get();
  const records = recordsRes.data || [];
  const firstDayRecord = records.find(record => record.day === 1);
  const group = firstDayRecord ? firstDayRecord.group : '';
  if (!group) {
    return { success: false, errMsg: '未找到首日分组记录' };
  }
  if (group !== INTERVENTION_GROUP) {
    return { success: true, data: { group, isInterventionGroup: false } };
  }

  const watchedIndexSet = records.reduce((set, record) => {
    if (record.videoCompleted && record.interventionVideoIndex) {
      set[record.interventionVideoIndex] = true;
    }
    return set;
  }, {});
  const videos = INTERVENTION_VIDEO_TITLES.map((title, index) => ({
    index: index + 1,
    title,
    watched: Boolean(watchedIndexSet[index + 1])
  }));
  const selectedIndex = Number(event.videoIndex || 0);

  if (!selectedIndex) {
    return {
      success: true,
      data: {
        group,
        isInterventionGroup: true,
        watchedCount: Object.keys(watchedIndexSet).length,
        videos
      }
    };
  }
  if (!Number.isInteger(selectedIndex) || selectedIndex < 1 || selectedIndex > INTERVENTION_VIDEO_TITLES.length) {
    return { success: false, errMsg: '请选择有效的干预视频' };
  }
  if (watchedIndexSet[selectedIndex]) {
    return { success: false, errMsg: '该视频已观看，请选择其他视频' };
  }

  const fileID = `${INTERVENTION_VIDEO_FILE_ID_PREFIX}/${String(selectedIndex).padStart(2, '0')}.mp4`;
  const tempUrlRes = await cloud.getTempFileURL({ fileList: [fileID] });
  const videoFile = tempUrlRes.fileList && tempUrlRes.fileList[0];
  if (!videoFile || videoFile.status !== 0 || !videoFile.tempFileURL) {
    return { success: false, errMsg: '当天干预视频暂不可用' };
  }

  return {
    success: true,
    data: {
      group,
      isInterventionGroup: true,
      watchedCount: Object.keys(watchedIndexSet).length,
      videos,
      video: {
        index: selectedIndex,
        title: INTERVENTION_VIDEO_TITLES[selectedIndex - 1],
        fileID,
        url: videoFile.tempFileURL
      }
    }
  };
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
  const isBaseline = day <= 3;
  const interventionDay = Math.max(1, day - 3);
  const week = isBaseline ? 1 : Math.ceil(interventionDay / 7) + 1;
  const weekDay = isBaseline ? day : ((interventionDay - 1) % 7) + 1;
  return {
    week,
    weekDay,
    phase: isBaseline ? '基线期' : '干预期'
  };
};

// 分析短视频调查数据并生成反馈
const analyzeUsage = async (event) => {
  const data = event.data || {};
  const day = event.day || 1;
  const period = event.period || 24;
  const openid = cloud.getWXContext().OPENID;
  const userInfo = event.userInfo || {};
  const dayMeta = getDayMeta(day);
  const recordsRes = await db.collection('usageRecords').where({
    openid,
    surveyVersion: SURVEY_VERSION
  }).orderBy('createTime', 'asc').get();
  const existingRecords = recordsRes.data || [];
  const checkinState = getCheckinState(existingRecords, period);
  if (DAILY_CHECKIN_LIMIT_ENABLED && checkinState.todayCompleted) {
    return { success: false, errMsg: '今日检查已完成，请明天再来' };
  }
  if (day !== checkinState.currentDay) {
    return { success: false, errMsg: `请先完成第${checkinState.currentDay}天检查` };
  }
  if (day === 1) {
    const consentStatus = await getInitialConsentStatus();
    if (!consentStatus.data.accepted) {
      return { success: false, errMsg: '请先阅读实验说明并确认知情同意' };
    }
  }

  let group = data.group || '';
  if (day > 1) {
    const firstDayRecord = existingRecords.find(record => record.day === 1);
    group = firstDayRecord ? firstDayRecord.group : '';
  }
  if (day === 1 && !['1', '2'].includes(group)) {
    return { success: false, errMsg: '请选择有效组号' };
  }
  if (day > 1 && !group) {
    return { success: false, errMsg: '未找到首日分组记录' };
  }
  let selectedVideoIndex = 0;
  if (day > 3 && group === INTERVENTION_GROUP) {
    selectedVideoIndex = Number(data.selectedVideoIndex);
    if (!Number.isInteger(selectedVideoIndex) || selectedVideoIndex < 1 || selectedVideoIndex > INTERVENTION_VIDEO_TITLES.length) {
      return { success: false, errMsg: '请先选择当天干预视频' };
    }
    const videoAlreadyWatched = existingRecords.some(record => (
      record.videoCompleted && record.interventionVideoIndex === selectedVideoIndex
    ));
    if (videoAlreadyWatched) {
      return { success: false, errMsg: '该视频已观看，请选择其他视频' };
    }
    if (data.videoCompleted !== true) {
      return { success: false, errMsg: '请先完整观看当天干预视频' };
    }
  }
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
        group: group,
        gender: data.gender || '',
        grade: data.grade || '',
        primaryUsage: data.primaryUsage || '',
        readiness: data.readiness || '',
        consent: data.consent === 'agreed',
        interventionVideoIndex: selectedVideoIndex,
        interventionVideoTitle: selectedVideoIndex ? INTERVENTION_VIDEO_TITLES[selectedVideoIndex - 1] : '',
        videoCompleted: group === INTERVENTION_GROUP && day > 3 ? data.videoCompleted === true : false,
        videoCompletedTime: group === INTERVENTION_GROUP && day > 3 ? db.serverDate() : null,
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
        checkinDate: checkinState.today,
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
      text: `恭喜完成为期24天的短视频依赖评估与干预任务！平均每日短视频使用 ${totalAvgHours.toFixed(1)} 小时，阶段量表平均 ${avgDependencyScore} 分，综合评估为${finalLevel}。`
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
    case "getInterventionVideos":
      return await getInterventionVideos(event);
    case "getSurveyConfig":
      return await getSurveyConfig();
    case "getInitialConsentStatus":
      return await getInitialConsentStatus();
    case "acceptInitialConsent":
      return await acceptInitialConsent();
    case "saveInterventionReflection":
      return await saveInterventionReflection(event);
    case "updateSurveyConfig":
      return await updateSurveyConfig(event);
    case "analyzeUsage":
      return await analyzeUsage(event);
  }
};
