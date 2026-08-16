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
    }
  },

  methods: {
    onMaskTap() {
      this.triggerEvent('close');
    },

    onContentTap() {
      
    },

    onClose() {
      this.triggerEvent('close');
    },

    onRetry() {
      this.triggerEvent('retry');
    },

    onFinish() {
      this.triggerEvent('finish');
    }
  }
});