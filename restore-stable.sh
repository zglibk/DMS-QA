#!/bin/bash

echo "========================================"
echo "DMS-QA 稳定版本恢复脚本"
echo "========================================"
echo

echo "当前 Git 状态："
git status --short
echo

echo "可用的稳定版本标签："
git tag -l
echo

read -p "是否要恢复到 v1.0.0 稳定版本？(y/n): " choice
case "$choice" in 
  y|Y ) 
    echo
    echo "正在恢复到 v1.0.0 稳定版本..."
    
    echo "1. 保存当前工作区更改..."
    git stash push -m "Auto-stash before restore to v1.0.0"
    
    echo "2. 切换到 v1.0.0 标签..."
    git checkout v1.0.0
    
    echo "3. 创建基于稳定版本的新分支..."
    read -p "请输入新分支名称 (默认: hotfix-from-v1.0.0): " branch_name
    branch_name=${branch_name:-hotfix-from-v1.0.0}
    git checkout -b "$branch_name"
    
    echo
    echo "========================================"
    echo "恢复完成！"
    echo "当前分支: $branch_name"
    echo "基于版本: v1.0.0 (稳定版本)"
    echo "========================================"
    echo
    echo "如需恢复之前的工作区更改，请运行："
    echo "git stash pop"
    echo
    ;;
  * ) 
    echo "操作已取消。"
    ;;
esac
