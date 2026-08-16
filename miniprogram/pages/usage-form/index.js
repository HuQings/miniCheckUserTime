const likertOptions = [
  { value: '1', label: 'A.完全不符合' },
  { value: '2', label: 'B.不太符合' },
  { value: '3', label: 'C.不置可否' },
  { value: '4', label: 'D.比较符合' },
  { value: '5', label: 'E.完全符合' }
];

const dependencyQuestions = [
  { field: 'fatigue', text: '长时间刷短视频后，我会觉得空虚疲累。' },
  { field: 'guilt', text: '长时间刷短视频后，我会因逝去的时光而自责自疚。' },
  { field: 'interference', text: '长时间刷短视频，明显地干扰了我的学习和生活。' },
  { field: 'withdrawal', text: '倘若不能碰手机（比如手机没电、被老师统一管理时），我会觉得心里发慌、难受或想发脾气。' },
  { field: 'annoyance', text: '明知长时间刷短视频不好但又放不下，这令我很烦躁。' },
  { field: 'control', text: '我很难控制刷短视频的时长，有种“越刷越不够”的感觉。' }
];

const usageFields = [
  { title: '短视频使用_休闲娱乐类', countField: 'leisureCount', hoursField: 'leisureHours' },
  { title: '短视频使用_学习工作类', countField: 'studyCount', hoursField: 'studyHours' },
  { title: '短视频使用_社交类', countField: 'socialCount', hoursField: 'socialHours' }
];

const defaultSurveyConfig = {
  period: 21,
  usageFields,
  likertOptions,
  genderOptions: ['男', '女'],
  gradeOptions: ['大一', '大二', '大三', '大四'],
  dependencyQuestions,
  interventionQuestion: {
    field: 'interventionEffective',
    text: '我认为本周实施的短视频使用干预方案对我是有效的。'
  },
  feedbackQuestion: '请为本项目实施提出意见或建议'
};

function getDayMeta(day) {
  const week = Math.ceil(day / 7);
  const weekDay = ((day - 1) % 7) + 1;
  return {
    week,
    weekDay,
    phase: week === 1 ? '基线期' : '干预期',
    title: `第${week}周第${weekDay}天`
  };
}

function getScaleQuestions(day, config = defaultSurveyConfig) {
  const meta = getDayMeta(day);
  const questionsSource = config.dependencyQuestions || dependencyQuestions;
  if (day === 1) {
    return questionsSource.map((item, index) => ({ ...item, no: index + 6 }));
  }
  if (meta.weekDay === 7) {
    const questions = questionsSource.map((item, index) => ({ ...item, no: index + 4 }));
    if (meta.week > 1 && config.interventionQuestion) {
      questions.push({ ...config.interventionQuestion, no: 10 });
    }
    return questions;
  }
  return [];
}

Page({
  data: {
    currentDay: 1,
    period: 21,
    dayMeta: getDayMeta(1),
    usageFields,
    likertOptions,
    scaleQuestions: getScaleQuestions(1),
    genderOptions: defaultSurveyConfig.genderOptions,
    gradeOptions: defaultSurveyConfig.gradeOptions,
    feedbackQuestion: defaultSurveyConfig.feedbackQuestion,
    surveyConfig: defaultSurveyConfig,
    formData: {
      gender: '',
      grade: '',
      leisureCount: '',
      leisureHours: '',
      studyCount: '',
      studyHours: '',
      socialCount: '',
      socialHours: '',
      scale: {},
      feedback: ''
    },
    isSubmitting: false,
    showModal: false,
    adviceData: null
  },

  onLoad: function(options) {
    const period = getApp().globalData.period || 21;
    const day = parseInt(options.day) || 1;
    const dayMeta = getDayMeta(day);
    this.setData({
      currentDay: day,
      period: period,
      dayMeta: dayMeta,
      scaleQuestions: getScaleQuestions(day)
    });
    
    wx.setNavigationBarTitle({
      title: `${dayMeta.title} - 短视频调查`
    });

    this.loadSurveyConfig(day);
  },

  loadSurveyConfig(day) {
    wx.cloud.callFunction({
      name: 'cloudUserInfo',
      data: {
        type: 'getSurveyConfig'
      }
    }).then(res => {
      if (res.result && res.result.data) {
        const config = {
          ...defaultSurveyConfig,
          ...res.result.data
        };
        getApp().globalData.period = config.period || 21;
        this.setData({
          period: config.period || 21,
          usageFields: config.usageFields || usageFields,
          likertOptions: config.likertOptions || likertOptions,
          genderOptions: config.genderOptions || defaultSurveyConfig.genderOptions,
          gradeOptions: config.gradeOptions || defaultSurveyConfig.gradeOptions,
          feedbackQuestion: config.feedbackQuestion || defaultSurveyConfig.feedbackQuestion,
          surveyConfig: config,
          scaleQuestions: getScaleQuestions(day, config)
        });
      }
    }).catch(err => {
      console.error('获取问卷配置失败:', err);
    });
  },

  onInputChange(e) {
    const field = e.currentTarget.dataset.field;
    this.setData({ [`formData.${field}`]: e.detail.value });
  },

  onChoiceTap(e) {
    const { field, value } = e.currentTarget.dataset;
    this.setData({ [`formData.${field}`]: value });
  },

  onScaleTap(e) {
    const { field, value } = e.currentTarget.dataset;
    this.setData({ [`formData.scale.${field}`]: value });
  },

  validateForm() {
    const { formData, currentDay, usageFields, scaleQuestions } = this.data;

    if (currentDay === 1 && (!formData.gender || !formData.grade)) {
      wx.showToast({ title: '请选择性别和年级', icon: 'none' });
      return false;
    }

    for (let i = 0; i < usageFields.length; i++) {
      const item = usageFields[i];
      const count = formData[item.countField];
      const hours = formData[item.hoursField];
      if (count === '' || parseFloat(count) < 0 || hours === '' || parseFloat(hours) < 0) {
        wx.showToast({ title: `请填写${item.title}数据`, icon: 'none' });
        return false;
      }
    }

    for (let i = 0; i < scaleQuestions.length; i++) {
      const question = scaleQuestions[i];
      if (!formData.scale[question.field]) {
        wx.showToast({ title: `请选择第${question.no}题`, icon: 'none' });
        return false;
      }
    }

    return true;
  },

  onSubmit() {
    if (!this.validateForm()) {
      return;
    }

    if (this.data.isSubmitting) {
      return;
    }

    this.setData({ isSubmitting: true });

    wx.showLoading({
      title: '分析中...'
    });

    const { formData, currentDay, period } = this.data;
    const app = getApp();

    wx.cloud.callFunction({
      name: 'cloudUserInfo',
      data: {
        type: 'analyzeUsage',
        day: currentDay,
        period: period,
        data: formData,
        openid: app.globalData.openid,
        userInfo: app.globalData.userInfo
      }
    }).then(res => {
      wx.hideLoading();
      
      if (res.result && res.result.success) {
        this.setData({
          adviceData: res.result.data,
          showModal: true,
          isSubmitting: false
        });
      } else {
        wx.showToast({
          title: '分析失败，请重试',
          icon: 'none'
        });
        this.setData({ isSubmitting: false });
      }
    }).catch(err => {
      wx.hideLoading();
      console.error('云函数调用失败:', err);
      
      wx.showToast({
        title: '网络错误，请重试',
        icon: 'none'
      });
      this.setData({ isSubmitting: false });
    });
  },

  onCloseModal() {
    this.setData({
      showModal: false,
      adviceData: null
    });
  },

  onRetry() {
    this.setData({
      showModal: false,
      adviceData: null
    });
    wx.navigateBack();
  },

  onFinish() {
    this.setData({
      showModal: false,
      adviceData: null
    });
    wx.reLaunch({
      url: '/pages/welcome/index'
    });
  }
});