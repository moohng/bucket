import { Octokit } from 'https://esm.sh/@octokit/rest';

export class GitHubService {
  private octokit: Octokit;
  private owner: string;
  private repo: string;
  private branch = 'oss'; // 使用固定的oss分支

  constructor(token: string, owner: string, repo: string) {
    this.octokit = new Octokit({ auth: token });
    this.owner = owner;
    this.repo = repo;
  }

  async init() {
    try {
      // 验证仓库访问权限
      const repoInfo = await this.octokit.repos.get({
        owner: this.owner,
        repo: this.repo,
      });

      // 获取默认分支的最新commit
      const mainBranch = await this.octokit.repos.getBranch({
        owner: this.owner,
        repo: this.repo,
        branch: repoInfo.data.default_branch,
      });

      // 检查oss分支是否存在
      try {
        await this.octokit.repos.getBranch({
          owner: this.owner,
          repo: this.repo,
          branch: this.branch,
        });
      } catch (error) {
        // 如果分支不存在，创建它
        await this.octokit.git.createRef({
          owner: this.owner,
          repo: this.repo,
          ref: `refs/heads/${this.branch}`,
          sha: mainBranch.data.commit.sha,
        });
      }

      // 确保 images 目录存在
      try {
        await this.octokit.repos.getContent({
          owner: this.owner,
          repo: this.repo,
          path: 'images',
          ref: this.branch,
        });
      } catch (error) {
        // 如果目录不存在，创建它
        await this.octokit.repos.createOrUpdateFileContents({
          owner: this.owner,
          repo: this.repo,
          branch: this.branch,
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

  async getFolders(): Promise<string[]> {
    try {
      const response = await this.octokit.repos.getContent({
        owner: this.owner,
        repo: this.repo,
        path: 'images',
        ref: this.branch
      });

      if (Array.isArray(response.data)) {
        return response.data
          .filter(item => item.type === 'dir')
          .map(dir => dir.name);
      }
      return [];
    } catch {
      return [];
    }
  }

  async createFolder(name: string): Promise<boolean> {
    try {
      await this.octokit.repos.createOrUpdateFileContents({
        owner: this.owner,
        repo: this.repo,
        branch: this.branch,
        path: `images/${name}/.gitkeep`,
        message: `Create folder: ${name}`,
        content: '',
      });
      return true;
    } catch {
      return false;
    }
  }

  async uploadImage(file: File, folder?: string): Promise<string> {
    try {
      const content = await this.convertFileToBase64(file);
      const path = folder 
        ? `images/${folder}/${Date.now()}-${file.name}`
        : `images/${Date.now()}-${file.name}`;

      const response = await this.octokit.repos.createOrUpdateFileContents({
        owner: this.owner,
        repo: this.repo,
        branch: this.branch,
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

  async deleteImage(path: string): Promise<{ success: boolean; sha: string }> {
    try {
      // 获取文件信息以获取sha
      const fileInfo = await this.octokit.repos.getContent({
        owner: this.owner,
        repo: this.repo,
        path,
        ref: this.branch
      });

      if ('sha' in fileInfo.data) {
        // 删除文件
        await this.octokit.repos.deleteFile({
          owner: this.owner,
          repo: this.repo,
          branch: this.branch,
          path,
          message: `Delete image: ${path}`,
          sha: fileInfo.data.sha
        });
        return { success: true, sha: fileInfo.data.sha };
      }
      return { success: false, sha: '' };
    } catch (error: any) {
      if (error.status === 404) {
        throw new Error('文件不存在');
      }
      if (error.status === 403) {
        throw new Error('无权限删除文件');
      }
      throw new Error('删除失败：' + (error.message || '未知错误'));
    }
  }

  private convertToCDN(sha: string, path: string): string {
    // 使用oss分支的CDN地址
    return `https://cdn.jsdelivr.net/gh/${this.owner}/${this.repo}@${this.branch}/${path}`;
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

  async getImageList(folder?: string): Promise<Array<{ name: string; url: string }>> {
    const path = folder ? `images/${folder}` : 'images';
    const response = await this.octokit.repos.getContent({
      owner: this.owner,
      repo: this.repo,
      path,
      ref: this.branch
    });

    if (Array.isArray(response.data)) {
      return response.data
        .filter(file => file.type === 'file' && file.name !== '.gitkeep')
        .map(file => ({
          name: file.name,
          url: this.convertToCDN(file.sha, file.path)
        }));
    }
    return [];
  }
}
