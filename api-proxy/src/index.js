export default {
  async fetch(request) {
    const url = new URL(request.url)
    url.hostname = "f7t8ba3h8a.execute-api.ap-south-1.amazonaws.com"
    return fetch(new Request(url, request))
  }
}
