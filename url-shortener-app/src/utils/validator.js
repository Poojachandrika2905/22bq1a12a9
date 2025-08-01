 export const validateURL = (url) => {
  const pattern = /^(https?:\/\/)[^\s/$.?#].[^\s]*$/i;
  return pattern.test(url);
};