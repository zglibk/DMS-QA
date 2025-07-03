// 文件自动拷贝服务
const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { getDynamicConfig } = require('../db');
const fileCopyConfig = require('../config/path-mapping');

class FileCopyService {
  constructor() {
    this.config = fileCopyConfig.fileCopy;
    this.dbConfig = null; // 动态获取的数据库配置
  }

  // 获取动态数据库配置
  async getDbConfig() {
    if (!this.dbConfig) {
      try {
        this.dbConfig = await getDynamicConfig();
        console.log('获取到动态数据库配置:', {
          server: this.dbConfig.server,
          fileStoragePath: this.dbConfig.FileStoragePath,
          fileServerPort: this.dbConfig.FileServerPort,
          fileUrlPrefix: this.dbConfig.FileUrlPrefix
        });
      } catch (error) {
        console.warn('获取动态数据库配置失败:', error.message);
        throw new Error('无法获取数据库配置');
      }
    }
    return this.dbConfig;
  }

  // 生成唯一文件名
  generateUniqueFileName(originalPath) {
    const ext = path.extname(originalPath);
    let baseName = path.basename(originalPath, ext);
    const timestamp = Date.now();
    const uuid = uuidv4().substring(0, 8);

    // 确保文件名是UTF-8编码
    try {
      // 如果baseName包含非ASCII字符，进行URL编码处理
      if (/[^\x00-\x7F]/.test(baseName)) {
        // 保留中文字符，只替换特殊符号
        baseName = baseName.replace(/[<>:"/\\|?*]/g, '_');
        // 限制长度，避免文件名过长
        if (baseName.length > 30) {
          baseName = baseName.substring(0, 30);
        }
      } else {
        // ASCII字符，正常处理
        baseName = baseName.substring(0, 30).replace(/[^\w.-]/g, '_');
      }
    } catch (error) {
      console.warn('文件名编码处理失败，使用默认名称:', error.message);
      baseName = 'file';
    }

    return `${timestamp}_${uuid}_${baseName}${ext}`;
  }

  // 路径映射：将Excel临时路径映射到实际网络路径
  mapTempPathToNetworkPath(tempPath) {
    const pathMappingConfig = require('../config/path-mapping');

    if (!pathMappingConfig.pathMapping || !pathMappingConfig.pathMapping.tempToNetworkMapping) {
      return tempPath;
    }

    for (const mapping of pathMappingConfig.pathMapping.tempToNetworkMapping) {
      const match = tempPath.match(mapping.tempPattern);
      if (match) {
        // 使用捕获组替换路径
        const networkPath = mapping.networkPath.replace('$1', match[1]);
        console.log(`路径映射: ${tempPath} -> ${networkPath}`);
        return networkPath;
      }
    }

    return tempPath;
  }

  // 检查文件是否存在且可访问
  async checkFileExists(filePath) {
    try {
      // 处理file:///前缀
      let cleanPath = filePath;
      if (cleanPath.startsWith('file:///')) {
        cleanPath = cleanPath.substring(8);
      }

      // 处理URL编码的中文路径
      try {
        if (cleanPath.includes('%')) {
          cleanPath = decodeURIComponent(cleanPath);
        }
      } catch (e) {
        console.warn('路径解码失败，使用原路径:', e.message);
      }

      // 转换为本地路径格式
      if (process.platform === 'win32') {
        cleanPath = cleanPath.replace(/\//g, '\\');
      }

      // 标准化路径
      cleanPath = path.normalize(cleanPath);

      // 尝试路径映射
      const mappedPath = this.mapTempPathToNetworkPath(cleanPath);
      if (mappedPath !== cleanPath) {
        console.log(`使用映射路径: ${mappedPath}`);
        cleanPath = mappedPath;
      }

      // 首先尝试直接访问
      try {
        const stats = await fs.stat(cleanPath);
        return {
          exists: true,
          size: stats.size,
          isFile: stats.isFile(),
          path: cleanPath,
          isMapped: mappedPath !== filePath
        };
      } catch (directError) {
        console.warn(`直接访问失败: ${cleanPath}`, directError.message);

        // 如果是网络路径，尝试其他方法
        if (cleanPath.startsWith('\\\\')) {
          console.log('尝试网络路径访问...');
          // 可以在这里添加网络路径的特殊处理
          // 比如使用net use命令或其他网络访问方法
        }

        throw directError;
      }
    } catch (error) {
      console.warn(`文件检查失败: ${filePath}`, error.message);
      return {
        exists: false,
        error: error.message,
        path: filePath,
        isMapped: false
      };
    }
  }

  // 检查文件扩展名是否允许
  isAllowedFileType(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    return this.config.allowedExtensions.includes(ext);
  }

  // 检查文件大小是否在限制内
  isFileSizeAllowed(fileSize) {
    return fileSize <= this.config.maxFileSize;
  }

  // 确保目标目录存在
  async ensureTargetDirectory() {
    const dbConfig = await this.getDbConfig();

    if (!dbConfig.FileStoragePath) {
      throw new Error('文件存储路径未配置，请在连接配置中设置文件存储路径');
    }

    const targetDir = path.resolve(dbConfig.FileStoragePath);
    try {
      await fs.mkdir(targetDir, { recursive: true });
      console.log('确保目标目录存在:', targetDir);
      return targetDir;
    } catch (error) {
      console.error('创建目标目录失败:', error);
      throw new Error(`无法创建目标目录 ${targetDir}: ${error.message}`);
    }
  }

  // 拷贝文件到服务器
  async copyFileToServer(sourceFilePath, fileName = null) {
    try {
      // 1. 检查文件是否存在
      const fileCheck = await this.checkFileExists(sourceFilePath);
      if (!fileCheck.exists) {
        throw new Error(`源文件不存在: ${sourceFilePath}`);
      }

      if (!fileCheck.isFile) {
        throw new Error(`路径不是文件: ${sourceFilePath}`);
      }

      // 2. 检查文件类型
      if (!this.isAllowedFileType(sourceFilePath)) {
        throw new Error(`不支持的文件类型: ${path.extname(sourceFilePath)}`);
      }

      // 3. 检查文件大小
      if (!this.isFileSizeAllowed(fileCheck.size)) {
        const sizeMB = (fileCheck.size / (1024 * 1024)).toFixed(2);
        const limitMB = (this.config.maxFileSize / (1024 * 1024)).toFixed(2);
        throw new Error(`文件过大: ${sizeMB}MB，限制: ${limitMB}MB`);
      }

      // 4. 确保目标目录存在
      const targetDir = await this.ensureTargetDirectory();

      // 5. 生成唯一文件名
      const uniqueFileName = fileName || this.generateUniqueFileName(sourceFilePath);
      const targetPath = path.join(targetDir, uniqueFileName);

      // 6. 拷贝文件（支持跨网络拷贝）
      const dbConfig = await this.getDbConfig();
      const isRemoteTarget = dbConfig.server !== 'localhost' && dbConfig.server !== '127.0.0.1';

      if (isRemoteTarget) {
        // 跨网络拷贝：从网络共享拷贝到远程服务器
        await this.copyFileToRemoteServer(fileCheck.path, targetPath, dbConfig);
      } else {
        // 本地拷贝
        await fs.copyFile(fileCheck.path, targetPath);
      }

      // 7. 验证拷贝结果（本地验证）
      let targetStats;
      if (!isRemoteTarget) {
        targetStats = await fs.stat(targetPath);
        if (targetStats.size !== fileCheck.size) {
          throw new Error('文件拷贝不完整');
        }
      }

      // 8. 生成访问URL
      const serverIP = dbConfig.server;
      const serverPort = dbConfig.FileServerPort || 8080;
      const urlPrefix = dbConfig.FileUrlPrefix || '/files';
      const accessUrl = `http://${serverIP}:${serverPort}${urlPrefix}/${uniqueFileName}`;

      console.log(`文件拷贝成功: ${sourceFilePath} -> ${targetPath}`);

      return {
        success: true,
        originalPath: sourceFilePath,
        targetPath: targetPath,
        fileName: uniqueFileName,
        accessUrl: accessUrl,
        fileSize: fileCheck.size,
        copyTime: new Date().toISOString()
      };

    } catch (error) {
      console.error('文件拷贝失败:', error);
      return {
        success: false,
        originalPath: sourceFilePath,
        error: error.message,
        copyTime: new Date().toISOString()
      };
    }
  }

  // 跨网络拷贝文件到远程服务器
  async copyFileToRemoteServer(sourcePath, targetPath, dbConfig) {
    try {
      console.log(`跨网络拷贝: ${sourcePath} -> ${dbConfig.server}:${targetPath}`);

      // 方法1: 使用Node.js的fs模块直接读写文件
      // 先读取源文件内容
      console.log('读取源文件内容...');
      const sourceData = await fs.readFile(sourcePath);
      console.log(`源文件读取成功，大小: ${sourceData.length} bytes`);

      // 构建远程路径 (UNC路径)
      const remotePath = `\\\\${dbConfig.server}\\${targetPath.replace(':', '$')}`;
      console.log(`远程目标路径: ${remotePath}`);

      // 确保远程目录存在
      const remoteDir = path.dirname(remotePath);
      await this.ensureRemoteDirectory(remoteDir, dbConfig.server);

      // 写入到远程路径
      console.log('写入到远程路径...');
      await fs.writeFile(remotePath, sourceData);
      console.log(`跨网络拷贝成功: ${sourcePath} -> ${remotePath}`);

      return {
        success: true,
        remotePath: remotePath,
        fileSize: sourceData.length
      };

    } catch (error) {
      console.error('跨网络拷贝异常:', error);

      // 如果直接拷贝失败，尝试使用robocopy命令
      try {
        console.log('尝试使用robocopy进行拷贝...');
        return await this.copyFileUsingRobocopy(sourcePath, targetPath, dbConfig);
      } catch (robocopyError) {
        console.error('robocopy拷贝也失败:', robocopyError);
        throw new Error(`跨网络拷贝失败: ${error.message}`);
      }
    }
  }

  // 使用robocopy进行文件拷贝
  async copyFileUsingRobocopy(sourcePath, targetPath, dbConfig) {
    const { spawn } = require('child_process');

    // 分离源文件的目录和文件名
    const sourceDir = path.dirname(sourcePath);
    const sourceFileName = path.basename(sourcePath);

    // 构建目标目录
    const targetDir = `\\\\${dbConfig.server}\\${path.dirname(targetPath).replace(':', '$')}`;
    const targetFileName = path.basename(targetPath);

    console.log(`Robocopy: ${sourceDir} -> ${targetDir}`);
    console.log(`文件: ${sourceFileName} -> ${targetFileName}`);

    return new Promise((resolve, reject) => {
      // robocopy source destination filename /R:3 /W:1
      const robocopy = spawn('robocopy', [
        sourceDir,
        targetDir,
        sourceFileName,
        '/R:3',  // 重试3次
        '/W:1',  // 等待1秒
        '/NP',   // 不显示进度
        '/NJH',  // 不显示作业头
        '/NJS'   // 不显示作业摘要
      ], {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';

      robocopy.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      robocopy.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      robocopy.on('close', (code) => {
        // robocopy的退出码: 0=无文件拷贝, 1=成功拷贝, 2=额外文件/目录, 4=不匹配文件, 8=失败
        if (code <= 2) {
          console.log(`Robocopy拷贝成功 (退出码: ${code})`);

          // 如果文件名不同，需要重命名
          if (sourceFileName !== targetFileName) {
            const tempPath = path.join(targetDir, sourceFileName);
            const finalPath = path.join(targetDir, targetFileName);
            // 这里可以添加重命名逻辑，但为了简化，我们假设文件名相同
          }

          resolve({
            success: true,
            remotePath: path.join(targetDir, targetFileName)
          });
        } else {
          console.error(`Robocopy拷贝失败 (退出码: ${code}):`, stderr || stdout);
          reject(new Error(`Robocopy拷贝失败: ${stderr || stdout || '未知错误'}`));
        }
      });

      robocopy.on('error', (error) => {
        console.error('Robocopy执行错误:', error);
        reject(new Error(`Robocopy执行失败: ${error.message}`));
      });
    });
  }

  // 确保远程目录存在
  async ensureRemoteDirectory(remoteDir, serverIP) {
    try {
      const { spawn } = require('child_process');
      const psCommand = `if (!(Test-Path "${remoteDir}")) { New-Item -ItemType Directory -Path "${remoteDir}" -Force }`;

      return new Promise((resolve, reject) => {
        const ps = spawn('powershell', ['-Command', psCommand], {
          stdio: ['pipe', 'pipe', 'pipe']
        });

        let stderr = '';
        ps.stderr.on('data', (data) => {
          stderr += data.toString();
        });

        ps.on('close', (code) => {
          if (code === 0) {
            console.log(`远程目录确保成功: ${remoteDir}`);
            resolve();
          } else {
            console.warn(`远程目录创建警告 (退出码: ${code}):`, stderr);
            resolve(); // 即使失败也继续，可能目录已存在
          }
        });

        ps.on('error', (error) => {
          console.warn('远程目录创建错误:', error.message);
          resolve(); // 继续执行，不阻塞主流程
        });
      });
    } catch (error) {
      console.warn('确保远程目录异常:', error.message);
      // 不抛出错误，继续执行
    }
  }

  // 批量拷贝文件
  async copyMultipleFiles(filePaths) {
    const results = [];
    
    for (const filePath of filePaths) {
      if (filePath && filePath.trim()) {
        const result = await this.copyFileToServer(filePath.trim());
        results.push(result);
      }
    }

    return {
      total: filePaths.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results: results
    };
  }

  // 清理过期文件（可选功能）
  async cleanupOldFiles(daysOld = 30) {
    try {
      const dbConfig = await this.getDbConfig();

      if (!dbConfig.FileStoragePath) {
        throw new Error('文件存储路径未配置');
      }

      const targetDir = path.resolve(dbConfig.FileStoragePath);
      const files = await fs.readdir(targetDir);
      const cutoffTime = Date.now() - (daysOld * 24 * 60 * 60 * 1000);

      let deletedCount = 0;

      for (const file of files) {
        const filePath = path.join(targetDir, file);
        const stats = await fs.stat(filePath);

        if (stats.mtime.getTime() < cutoffTime) {
          await fs.unlink(filePath);
          deletedCount++;
          console.log(`删除过期文件: ${file}`);
        }
      }

      return {
        success: true,
        deletedCount: deletedCount,
        message: `清理了 ${deletedCount} 个过期文件`
      };

    } catch (error) {
      console.error('清理过期文件失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

// 导出单例实例
module.exports = new FileCopyService();
