// 注入不蒜子统计脚本
if (typeof window !== 'undefined') {
  const script = document.createElement('script');
  script.src = 'https://busuanzi.ibruce.info/busuanzi/2.3/busuanzi.pure.mini.js';
  script.async = true;
  document.head.appendChild(script);
}

export {};
