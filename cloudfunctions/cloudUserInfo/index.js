const cloud = require("wx-server-sdk");
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});

const db = cloud.database();
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
  const period = event.period || 7;
  
  try {
    // 获取该用户的所有记录
    const recordsRes = await db.collection('usageRecords').where({
      openid: openid
    }).orderBy('createTime', 'asc').get();
    
    const records = recordsRes.data || [];
    const completedDays = records.length;
    let currentDay = completedDays + 1;
    
    // 如果已经完成period天，则currentDay保持为period
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

// 分析使用时长并生成建议
const analyzeUsage = async (event) => {
  const data = event.data || {};
  const day = event.day || 1;
  const period = event.period || 7;
  const openid = event.openid;
  const userInfo = event.userInfo || {};
  const weekdayHours = parseFloat(data.weekdayHours) || 0;
  const weekendHours = parseFloat(data.weekendHours) || 0;
  const socialHours = parseFloat(data.socialHours) || 0;
  const workHours = parseFloat(data.workHours) || 0;
  const gameHours = parseFloat(data.gameHours) || 0;
  const videoHours = parseFloat(data.videoHours) || 0;
  const shopHours = parseFloat(data.shopHours) || 0;

  // 计算总使用时长
  const avgDailyHours = (weekdayHours * 5 + weekendHours * 2) / 7;
  const totalUsageHours = socialHours + workHours + gameHours + videoHours + shopHours;

  // 保存用户使用记录到数据库
  try {
    await db.collection('usageRecords').add({
      data: {
        openid: openid,
        day: day,
        userInfo: userInfo,
        usageData: data,
        avgDailyHours: avgDailyHours,
        totalUsageHours: totalUsageHours,
        score: 0, // 先保存0，后面计算后再更新
        createTime: db.serverDate(),
        updateTime: db.serverDate()
      }
    });
  } catch (e) {
    console.error('保存使用记录失败:', e);
    // 保存失败不影响后续分析流程
  }

  // 判断是否是最后一天，如果是最后一天，则汇总分析
  let isFinalDay = day === period;
  let allRecords = [];
  
  if (isFinalDay) {
    try {
      const recordsRes = await db.collection('usageRecords').where({
        openid: openid
      }).orderBy('createTime', 'asc').get();
      allRecords = recordsRes.data || [];
    } catch (e) {
      console.error('获取历史记录失败:', e);
    }
  }

  // 生成评估和建议
  const adviceList = [];
  let score = 100;

  // 分析社交娱乐时间
  if (socialHours > 4) {
    adviceList.push({
      icon: '💬',
      type: '社交娱乐',
      level: 'high',
      levelText: '需要关注',
      content: `您每天的社交娱乐时间长达 ${socialHours} 小时，建议适当减少`,
      tips: '可以设置定时提醒，每使用30分钟休息5分钟'
    });
    score -= 15;
  } else if (socialHours > 2) {
    adviceList.push({
      icon: '💬',
      type: '社交娱乐',
      level: 'medium',
      levelText: '适度控制',
      content: `您每天的社交娱乐时间为 ${socialHours} 小时，保持在合理范围`,
      tips: '建议将部分时间用于阅读或学习新技能'
    });
    score -= 5;
  } else {
    adviceList.push({
      icon: '💬',
      type: '社交娱乐',
      level: 'low',
      levelText: '良好',
      content: '您的社交娱乐时间控制得很好',
      tips: '继续保持，可以适当增加户外活动时间'
    });
  }

  // 分析工作学习时间
  if (workHours < 1) {
    adviceList.push({
      icon: '💼',
      type: '工作学习',
      level: 'medium',
      levelText: '建议增加',
      content: '您在工作学习方面投入的时间较少',
      tips: '建议每天至少安排1-2小时用于工作或学习'
    });
    score -= 10;
  } else if (workHours > 6) {
    adviceList.push({
      icon: '💼',
      type: '工作学习',
      level: 'high',
      levelText: '注意休息',
      content: `您的工作学习时间长达 ${workHours} 小时，注意劳逸结合`,
      tips: '每工作50分钟，建议休息10分钟'
    });
    score -= 8;
  } else {
    adviceList.push({
      icon: '💼',
      type: '工作学习',
      level: 'low',
      levelText: '优秀',
      content: '您的工作学习时间安排合理',
      tips: '保持良好的工作和学习习惯'
    });
  }

  // 分析游戏时间
  if (gameHours > 3) {
    adviceList.push({
      icon: '🎮',
      type: '游戏娱乐',
      level: 'high',
      levelText: '需要控制',
      content: `您的游戏时间达到 ${gameHours} 小时，建议适当减少`,
      tips: '可以尝试制定游戏时间表，每天不超过1小时'
    });
    score -= 20;
  } else if (gameHours > 1) {
    adviceList.push({
      icon: '🎮',
      type: '游戏娱乐',
      level: 'medium',
      levelText: '适度',
      content: '您的游戏时间在可控范围内',
      tips: '可以尝试用运动或社交活动替代部分游戏时间'
    });
    score -= 5;
  }

  // 分析视频时间
  if (videoHours > 3) {
    adviceList.push({
      icon: '📺',
      type: '视频影音',
      level: 'high',
      levelText: '注意用眼',
      content: `您观看视频的时间较长，达到 ${videoHours} 小时`,
      tips: '建议每观看20分钟让眼睛休息，避免蓝光伤害'
    });
    score -= 15;
  } else if (videoHours > 1) {
    adviceList.push({
      icon: '📺',
      type: '视频影音',
      level: 'medium',
      levelText: '适度',
      content: '您的视频观看时间适中',
      tips: '可以选择高质量的内容观看，避免浪费时间'
    });
  }

  // 分析购物时间
  if (shopHours > 2) {
    adviceList.push({
      icon: '🛒',
      type: '购物浏览',
      level: 'medium',
      levelText: '理性消费',
      content: `您在购物应用上花费了 ${shopHours} 小时`,
      tips: '建议制定购物清单，避免冲动消费'
    });
    score -= 8;
  }

  // 总体评估
  let summary = {
    rating: '',
    emoji: '',
    text: ''
  };

  if (score >= 85) {
    summary = {
      rating: '优秀',
      emoji: '🌟',
      text: '您的手机使用习惯非常好，继续保持！'
    };
  } else if (score >= 70) {
    summary = {
      rating: '良好',
      emoji: '👍',
      text: '您的手机使用习惯整体良好，还有优化空间。'
    };
  } else if (score >= 55) {
    summary = {
      rating: '一般',
      emoji: '⚠️',
      text: '您的手机使用习惯需要改善，建议参考以上建议进行调整。'
    };
  } else {
    summary = {
      rating: '需改进',
      emoji: '🚨',
      text: '您的手机使用时间过长，建议立即开始调整，关注身心健康。'
    };
  }

  // 更新数据库中的评分
  try {
    const recordRes = await db.collection('usageRecords').where({
      openid: openid,
      day: day
    }).orderBy('createTime', 'desc').limit(1).get();
    
    if (recordRes.data && recordRes.data.length > 0) {
      const recordId = recordRes.data[0]._id;
      await db.collection('usageRecords').doc(recordId).update({
        data: {
          score: score,
          updateTime: db.serverDate()
        }
      });
    }
  } catch (e) {
    console.error('更新评分失败:', e);
    // 更新失败不影响返回结果
  }

  // 如果是最后一天，进行最终汇总分析
  if (isFinalDay && allRecords.length > 0) {
    const totalScore = allRecords.reduce((sum, record) => sum + (record.score || 0), 0);
    const avgScore = Math.round(totalScore / allRecords.length);
    const totalAvgHours = allRecords.reduce((sum, record) => sum + (record.avgDailyHours || 0), 0) / allRecords.length;
    
    // 根据平均分生成最终评估
    let finalSummary = {
      rating: '',
      emoji: '',
      text: ''
    };
    
    if (avgScore >= 85) {
      finalSummary = {
        rating: '优秀',
        emoji: '🏆',
        text: `恭喜完成${period}天打卡！您的平均得分是 ${avgScore} 分，手机使用习惯非常好！${period}天平均每天使用 ${totalAvgHours.toFixed(1)} 小时。`
      };
    } else if (avgScore >= 70) {
      finalSummary = {
        rating: '良好',
        emoji: '🌟',
        text: `恭喜完成${period}天打卡！您的平均得分是 ${avgScore} 分，手机使用习惯整体良好。${period}天平均每天使用 ${totalAvgHours.toFixed(1)} 小时，继续努力！`
      };
    } else if (avgScore >= 55) {
      finalSummary = {
        rating: '一般',
        emoji: '📈',
        text: `恭喜完成${period}天打卡！您的平均得分是 ${avgScore} 分，手机使用习惯还有改善空间。${period}天平均每天使用 ${totalAvgHours.toFixed(1)} 小时，建议参考建议持续优化。`
      };
    } else {
      finalSummary = {
        rating: '需改进',
        emoji: '💪',
        text: `恭喜完成${period}天打卡！您的平均得分是 ${avgScore} 分，手机使用时间较长。${period}天平均每天使用 ${totalAvgHours.toFixed(1)} 小时，建议制定计划逐步减少使用时长。`
      };
    }
    
    return {
      success: true,
      data: {
        isFinal: true,
        summary: finalSummary,
        adviceList: adviceList,
        score: avgScore,
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
    case "analyzeUsage":
      return await analyzeUsage(event);
  }
};
