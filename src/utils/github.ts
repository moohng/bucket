import { Octokit } from 'https://esm.sh/@octokit/rest';

export class GitHubService {
  private octokit: Octokit;
  private owner: string;
  private repo: string;

  constructor(token: string, owner: string, repo: string) {
    this.octokit = new Octokit({ auth: token });
    this.owner = owner;
    this.repo = repo;
  }

  async init() {
    try {
      // 验证仓库访问权限
      await this.octokit.repos.get({
        owner: this.owner,
        repo: this.repo,
      });

      // 确保 images 目录存在
      try {
        await this.octokit.repos.getContent({
          owner: this.owner,
          repo: this.repo,
          path: 'images',
        });
      } catch (error) {
        // 如果目录不存在，创建它
        await this.octokit.repos.createOrUpdateFileContents({
          owner: this.owner,
          repo: this.repo,
          path: 'images/.gitkeep',
          message: 'Initialize images directory',
          content: '',
        });
      }
      return true;
    } catch (error: any) {
      if (error.status === 404) {
        throw new Error('仓库不存在或无访问权限');
      }
      if (error.status === 403) {
        throw new Error('Token 权限不足，请确保有仓库写入权限');
      }
      throw error;
    }
  }

  async uploadImage(file: File): Promise<string> {
    try {
      const content = await this.convertFileToBase64(file);
      const path = `images/${Date.now()}-${file.name}`;

      const response = await this.octokit.repos.createOrUpdateFileContents({
        owner: this.owner,
        repo: this.repo,
        path,
        message: `Upload image: ${file.name}`,
        content,
      });

      return this.convertToCDN(response.data.content?.sha || '', path);
    } catch (error: any) {
      if (error.status === 403) {
        throw new Error('无权限上传文件，请检查 Token 权限');
      }
      throw new Error('上传失败：' + (error.message || '未知错误'));
    }
  }

  private convertToCDN(sha: string, path: string): string {
    return `https://cdn.jsdelivr.net/gh/${this.owner}/${this.repo}/${path}`;
  }

  private async convertFileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64 = reader.result as string;
        resolve(base64.split(',')[1]);
      };
      reader.onerror = reject;
    });
  }

  async getImageList(): Promise<Array<{ name: string; url: string }>> {
    const response = await this.octokit.repos.getContent({
      owner: this.owner,
      repo: this.repo,
      path: 'images'
    });

    if (Array.isArray(response.data)) {
      return response.data.map(file => ({
        name: file.name,
        url: this.convertToCDN(file.sha, file.path)
      }));
    }
    return [];
  }
}
