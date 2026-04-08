const cloud = require("wx-server-sdk");
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});

const db = cloud.database();

// 获取openid
const getOpenId = async () => {
  const wxContext = cloud.getWXContext();
  return {
    openid: wxContext.OPENID,
    appid: wxContext.APPID,
    unionid: wxContext.UNIONID,
  };
};

// 保存每日短视频使用记录
const saveDailyUsage = async (event) => {
  const { day, phase, dayInPhase, data, openid } = event;
  
  try {
    await db.collection('dailyUsage').add({
      data: {
        openid: openid,
        day: day,
        phase: phase,
        dayInPhase: dayInPhase,
        usageData: data,
        totalHours: (
          (parseFloat(data.entertainment.hours) || 0) +
          (parseFloat(data.learning.hours) || 0) +
          (parseFloat(data.social.hours) || 0)
        ).toFixed(2),
        totalFrequency: (
          (parseInt(data.entertainment.frequency) || 0) +
          (parseInt(data.learning.frequency) || 0) +
          (parseInt(data.social.frequency) || 0)
        ),
        createTime: db.serverDate()
      }
    });
    
    return { success: true };
  } catch (e) {
    console.error('保存每日记录失败:', e);
    return { success: false, errMsg: e.message };
  }
};

// 提交问卷量表
const submitQuestionnaire = async (event) => {
  const { type, phase, answers, usageData, feedback, openid } = event;
  
  try {
    await db.collection('questionnaires').add({
      data: {
        openid: openid,
        type: type,
        phase: phase,
        answers: answers,
        usageData: usageData,
        feedback: feedback || '',
        score: calculateScore(answers),
        createTime: db.serverDate()
      }
    });
    
    return { success: true };
  } catch (e) {
    console.error('提交问卷失败:', e);
    return { success: false, errMsg: e.message };
  }
};

// 计算问卷得分
const calculateScore = (answers) => {
  const sum = answers.reduce((total, val) => total + val, 0);
  return sum;
};

// 根据基线期数据计算分组
const calculateGroup = async (openid) => {
  try {
    // 获取基线期所有每日记录
    const dailyRes = await db.collection('dailyUsage').where({
      openid: openid,
      phase: 1
    }).orderBy('dayInPhase', 'asc').get();
    
    // 获取基线期问卷得分
    const questionnaireRes = await db.collection('questionnaires').where({
      openid: openid,
      type: 'baseline'
    }).get();
    
    const dailyData = dailyRes.data || [];
    const questionnaireData = questionnaireRes.data || [];
    
    if (dailyData.length === 0 && questionnaireData.length === 0) {
      return { group: 'low', score: 0 };
    }
    
    // 计算总使用时长
    let totalHours = 0;
    dailyData.forEach(record => {
      totalHours += parseFloat(record.totalHours || 0);
    });
    const avgDailyHours = dailyData.length > 0 ? totalHours / dailyData.length : 0;
    
    // 问卷得分
    const questionnaireScore = questionnaireData.length > 0 ? questionnaireData[0].score : 0;
    
    // 综合评分算法：
    // - 每日平均时长（权重40%）：超过6小时为高，3-6为中，低于3为低
    // - 问卷得分（权重60%）：满分30分（6题*5分），18分以上为高依赖，12-18为中，低于12为低
    
    const hoursScore = avgDailyHours >= 6 ? 3 : (avgDailyHours >= 3 ? 2 : 1);
    const questionScore = questionnaireScore >= 18 ? 3 : (questionnaireScore >= 12 ? 2 : 1);
    
    const totalScore = hoursScore * 0.4 + questionScore * 0.6 * (30 / 6);
    
    let group = 'low';
    if (totalScore >= 2.5) {
      group = 'high';
    } else if (totalScore >= 1.8) {
      group = 'medium';
    } else {
      group = 'low';
    }
    
    return {
      group: group,
      score: questionnaireScore,
      avgDailyHours: avgDailyHours.toFixed(1),
      questionnaireScore: questionnaireScore,
      totalHours: totalHours.toFixed(1)
    };
  } catch (e) {
    console.error('计算分组失败:', e);
    return { group: 'low', score: 0 };
  }
};

// 获取分组结果
const getGroupResult = async (event) => {
  const openid = event.openid;
  
  try {
    // 先检查是否已有分组结果
    const userRes = await db.collection('users').where({
      openid: openid
    }).get();
    
    if (userRes.data && userRes.data.length > 0 && userRes.data[0].group) {
      return {
        success: true,
        data: {
          group: userRes.data[0].group,
          questionnaireScore: userRes.data[0].questionnaireScore || 0,
          avgDailyHours: userRes.data[0].avgDailyHours || '0'
        }
      };
    }
    
    // 计算分组
    const groupData = await calculateGroup(openid);
    
    // 保存分组结果到用户表
    try {
      await db.collection('users').where({
        openid: openid
      }).update({
        data: {
          group: groupData.group,
          questionnaireScore: groupData.questionnaireScore,
          avgDailyHours: groupData.avgDailyHours,
          phase: 1,
          updateTime: db.serverDate()
        }
      });
    } catch (e) {
      // 如果用户记录不存在，则创建
      await db.collection('users').add({
        data: {
          openid: openid,
          group: groupData.group,
          questionnaireScore: groupData.questionnaireScore,
          avgDailyHours: groupData.avgDailyHours,
          phase: 1,
          createTime: db.serverDate()
        }
      });
    }
    
    return {
      success: true,
      data: groupData
    };
  } catch (e) {
    console.error('获取分组结果失败:', e);
    return { success: false, errMsg: e.message };
  }
};

// 提交反馈
const submitFeedback = async (event) => {
  const { openid, feedback } = event;
  
  try {
    await db.collection('feedback').add({
      data: {
        openid: openid,
        feedback: feedback,
        createTime: db.serverDate()
      }
    });
    
    return { success: true };
  } catch (e) {
    console.error('提交反馈失败:', e);
    return { success: false, errMsg: e.message };
  }
};

// 获取打卡进度
const getCheckinProgress = async (event) => {
  const openid = event.openid;
  const period = event.period || 21;
  
  try {
    const recordsRes = await db.collection('dailyUsage').where({
      openid: openid
    }).orderBy('createTime', 'asc').get();
    
    const records = recordsRes.data || [];
    const completedDays = records.length;
    let currentDay = completedDays + 1;
    
    if (currentDay > period) {
      currentDay = period;
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

// 云函数入口函数
exports.main = async (event, context) => {
  switch (event.type) {
    case "getOpenId":
      return await getOpenId();
    case "saveDailyUsage":
      return await saveDailyUsage(event);
    case "submitQuestionnaire":
      return await submitQuestionnaire(event);
    case "getGroupResult":
      return await getGroupResult(event);
    case "submitFeedback":
      return await submitFeedback(event);
    case "getCheckinProgress":
      return await getCheckinProgress(event);
  }
};