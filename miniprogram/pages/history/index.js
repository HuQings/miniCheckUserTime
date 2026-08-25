const padTimePart = value => String(value).padStart(2, '0');

const formatRecordTime = value => {
  const source = value && value.$date ? value.$date : value;
  const date = new Date(source);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return `${date.getFullYear()}-${padTimePart(date.getMonth() + 1)}-${padTimePart(date.getDate())} ${padTimePart(date.getHours())}:${padTimePart(date.getMinutes())}`;
};

Page({
  data: {
    records: [],
    completedDays: 0,
    avgHours: 0,
    period: 24
  },

  onLoad: function (options) {
    const period = getApp().globalData.period || 24;
    this.setData({ period });
    this.loadSurveyConfig();
  },

  loadSurveyConfig: function() {
    wx.cloud.callFunction({
      name: 'cloudUserInfo',
      data: {
        type: 'getSurveyConfig'
      }
    }).then(res => {
      if (res.result && res.result.data && res.result.data.period) {
        const period = res.result.data.period;
        getApp().globalData.period = period;
        this.setData({ period });
      }
    }).catch(err => {
      console.error('获取问卷配置失败:', err);
    }).finally(() => {
      this.loadRecords();
    });
  },

  loadRecords: function() {
    wx.showLoading({
      title: '加载中...'
    });

    wx.cloud.callFunction({
      name: 'cloudUserInfo',
      data: {
        type: 'getCheckinProgress',
        openid: getApp().globalData.openid,
        period: getApp().globalData.period || 24
      }
    }).then(res => {
      wx.hideLoading();
      
      if (res.result && res.result.success) {
        const { records } = res.result.data;
        const displayRecords = records.map(record => ({
          ...record,
          displayCreateTime: formatRecordTime(record.createTime)
        }));
        const completedDays = records.length;
        const avgHours = completedDays > 0
          ? (records.reduce((sum, r) => sum + (r.avgDailyHours || 0), 0) / completedDays).toFixed(1)
          : '0.0';

        this.setData({
          records: displayRecords,
          completedDays: completedDays,
          avgHours: avgHours
        });
      }
    }).catch(err => {
      wx.hideLoading();
      console.error('加载记录失败:', err);
      wx.showToast({
        title: '加载失败，请重试',
        icon: 'none'
      });
    });
  },

  goToWelcome: function() {
    wx.navigateBack();
  }
});