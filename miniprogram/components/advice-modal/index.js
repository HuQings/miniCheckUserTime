Component({
  properties: {
    show: {
      type: Boolean,
      value: false
    },
    adviceData: {
      type: Object,
      value: null
    },
    period: {
      type: Number,
      value: 21
    },
    isSubmitting: {
      type: Boolean,
      value: false
    }
  },

  data: {
    taskEvaluation: '',
    reflectionValid: false
  },

  observers: {
    'show, adviceData': function(show, adviceData) {
      if (show && adviceData && adviceData.resultType === 'previousIntervention') {
        this.setData({
          taskEvaluation: '',
          reflectionValid: false
        });
      }
    }
  },

  methods: {
    onMaskTap() {
      if (this.properties.adviceData && this.properties.adviceData.resultType === 'previousIntervention') {
        return;
      }
      this.triggerEvent('close');
    },

    onContentTap() {
      
    },

    onClose() {
      this.triggerEvent('close');
    },

    onReflectionClose() {
      if (this.properties.isSubmitting) return;
      this.triggerEvent('reflectionclose');
    },

    onConfirm() {
      this.triggerEvent('confirm');
    },

    onRetry() {
      this.triggerEvent('retry');
    },

    onFinish() {
      this.triggerEvent('finish');
    },

    onReflectionInput(e) {
      const taskEvaluation = e.detail.value;
      this.setData({
        taskEvaluation,
        reflectionValid: Boolean(taskEvaluation.trim())
      });
    },

    onReflectionSubmit() {
      if (!this.data.reflectionValid || this.properties.isSubmitting) return;
      this.triggerEvent('reflectionsubmit', {
        taskEvaluation: this.data.taskEvaluation.trim()
      });
    }
  }
});